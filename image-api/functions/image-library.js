/**
 * Image Library API - Self-contained with JWT authentication
 * Handles image upload, metadata management, and tag-based search
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Environment variables
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE;
const S3_BUCKET = process.env.TB365_BUCKET || 'tb365-designs-stage';
const USE_DYNAMODB = process.env.USE_DYNAMODB === 'true';

// Predefined tag categories for validation
const PREDEFINED_TAG_CATEGORIES = {
  type: ['logo', 'photo', 'icon', 'background', 'illustration', 'graphic'],
  purpose: ['branding', 'marketing', 'decoration', 'content', 'header', 'footer'],
  style: ['professional', 'casual', 'modern', 'minimalist', 'vintage', 'colorful'],
  color: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'multicolor', 'transparent'],
  orientation: ['landscape', 'portrait', 'square']
};

// Response helpers (self-contained)
function successResponse(data, corsHeaders = {}) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-amz-date,x-amz-security-token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Max-Age': '86400',
      ...corsHeaders
    },
    body: JSON.stringify(data)
  };
}

function errorResponse(statusCode, message, details = {}, corsHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-amz-date,x-amz-security-token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Max-Age': '86400',
      ...corsHeaders
    },
    body: JSON.stringify({
      error: message,
      statusCode,
      ...details
    })
  };
}

/**
 * Extract user information from JWT token or return mock user in development
 */
function getUserFromEvent(event) {
  if (!USE_DYNAMODB) {
    // Mock mode: Return a test user
    console.log('🧪 MOCK MODE: Using mock user for testing');
    return {
      userId: 'mock-user-123',
      email: 'mockuser@example.com',
      userPartition: 'USER#mock-user-123'
    };
  }

  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims?.sub) {
      throw new Error('No user ID found in JWT token');
    }

    return {
      userId: claims.sub,
      email: claims.email || 'unknown@example.com',
      userPartition: `USER#${claims.sub}`
    };
  } catch (error) {
    console.error('Error extracting user from JWT:', error);
    throw new Error('Invalid authentication token');
  }
}

/**
 * Generate S3 key for user image
 */
function generateImageS3Key(userId, imageId, filename) {
  const stage = process.env.STAGE || 'stage';
  const extension = filename.split('.').pop() || 'jpg';
  return `${stage}/users/${userId}/images/${imageId}.${extension}`;
}

/**
 * Create searchable text from tags
 */
function createSearchableText(tags) {
  const allTags = [];

  if (tags.predefined && Array.isArray(tags.predefined)) {
    allTags.push(...tags.predefined);
  }

  if (tags.custom && Array.isArray(tags.custom)) {
    allTags.push(...tags.custom);
  }

  return allTags.join(' ').toLowerCase();
}

/**
 * Validate image upload request
 */
function validateImageUpload(data) {
  const { filename, contentType, tags } = data;

  if (!filename || typeof filename !== 'string') {
    throw new Error('Valid filename is required');
  }

  if (!contentType || !contentType.startsWith('image/')) {
    throw new Error('Valid image content type is required');
  }

  // Validate tags if provided
  if (tags) {
    if (tags.predefined && !Array.isArray(tags.predefined)) {
      throw new Error('Predefined tags must be an array');
    }

    if (tags.custom && !Array.isArray(tags.custom)) {
      throw new Error('Custom tags must be an array');
    }
  }

  return true;
}

/**
 * Handle image upload - generate presigned URL
 */
async function handleImageUpload(event) {
  try {
    const user = getUserFromEvent(event);
    const requestData = JSON.parse(event.body || '{}');

    // Validate input
    validateImageUpload(requestData);

    const { filename, contentType, tags = {} } = requestData;
    const imageId = uuidv4();
    const s3Key = generateImageS3Key(user.userId, imageId, filename);

    if (!USE_DYNAMODB) {
      // Mock mode: Return test response without DynamoDB/S3 operations
      console.log(`🧪 MOCK MODE: Image upload for ${filename} (${contentType})`);
      return successResponse({
        imageId,
        uploadUrl: `https://mock-s3-upload-url.example.com/${s3Key}?mock=true`,
        s3Key,
        filename,
        message: 'Mock presigned URL generated successfully'
      });
    }

    // Generate presigned URL for upload
    const uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        userId: user.userId,
        imageId: imageId,
        originalFilename: filename
      }
    }), { expiresIn: 3600 }); // 1 hour

    // Store image metadata in DynamoDB
    const imageMetadata = {
      PK: user.userPartition,
      SK: `IMAGE#${imageId}`,
      entityType: 'ImageMetadata',
      imageId,
      filename,
      contentType,
      s3Key,
      tags: {
        predefined: tags.predefined || [],
        custom: tags.custom || []
      },
      searchableText: createSearchableText(tags),
      uploadedAt: new Date().toISOString(),
      userId: user.userId,
      status: 'pending_upload',

      // GSI keys for efficient querying
      GSI1PK: tags.predefined && tags.predefined.length > 0 ? `IMAGE_TAG#${tags.predefined[0]}` : `IMAGE_TAG#untagged`,
      GSI1SK: `${user.userPartition}#IMAGE#${imageId}`,
      GSI2PK: 'ENTITY#ImageMetadata',
      GSI2SK: `USER#${user.userId}#${new Date().toISOString()}`
    };

    await docClient.send(new PutCommand({
      TableName: DYNAMODB_TABLE,
      Item: imageMetadata
    }));

    console.log(`✅ Image metadata stored: ${imageId} for user ${user.userId}`);

    return successResponse({
      imageId,
      uploadUrl,
      s3Key,
      filename,
      message: 'Presigned URL generated successfully'
    });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    return errorResponse(400, error.message);
  }
}

/**
 * Handle list user images
 */
async function handleListImages(event) {
  try {
    const user = getUserFromEvent(event);
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit) || 20;

    if (!USE_DYNAMODB) {
      // Mock mode: Return sample images
      console.log(`🧪 MOCK MODE: Listing images for user ${user.userId}`);
      const mockImages = [
        {
          imageId: 'mock-image-1',
          filename: 'sample-logo.png',
          contentType: 'image/png',
          tags: { predefined: ['logo'], custom: ['brand'] },
          uploadedAt: new Date().toISOString(),
          status: 'uploaded',
          s3Key: 'stage/users/mock-user/images/mock-image-1.png'
        },
        {
          imageId: 'mock-image-2',
          filename: 'test-photo.jpg',
          contentType: 'image/jpeg',
          tags: { predefined: ['photo'], custom: ['test'] },
          uploadedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          status: 'uploaded',
          s3Key: 'stage/users/mock-user/images/mock-image-2.jpg'
        }
      ];

      return successResponse({
        images: mockImages.slice(0, limit),
        count: mockImages.length
      });
    }

    const lastKey = queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : null;

    const queryParams_db = {
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': user.userPartition,
        ':sk': 'IMAGE#'
      },
      Limit: limit,
      ScanIndexForward: false // Most recent first
    };

    if (lastKey) {
      queryParams_db.ExclusiveStartKey = lastKey;
    }

    const result = await docClient.send(new QueryCommand(queryParams_db));

    const images = result.Items || [];
    const response = {
      images: images.map(item => ({
        imageId: item.imageId,
        filename: item.filename,
        contentType: item.contentType,
        tags: item.tags,
        uploadedAt: item.uploadedAt,
        status: item.status,
        s3Key: item.s3Key
      })),
      count: images.length
    };

    if (result.LastEvaluatedKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    console.log(`📋 Listed ${images.length} images for user ${user.userId}`);
    return successResponse(response);

  } catch (error) {
    console.error('❌ List images error:', error);
    return errorResponse(500, error.message);
  }
}

/**
 * Handle get specific image
 */
async function handleGetImage(event) {
  try {
    const user = getUserFromEvent(event);
    const imageId = event.pathParameters?.imageId;

    if (!imageId) {
      return errorResponse(400, 'Image ID is required');
    }

    const result = await docClient.send(new GetCommand({
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: user.userPartition,
        SK: `IMAGE#${imageId}`
      }
    }));

    if (!result.Item) {
      return errorResponse(404, 'Image not found');
    }

    // Generate presigned URL for download
    const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: result.Item.s3Key
    }), { expiresIn: 3600 });

    const response = {
      imageId: result.Item.imageId,
      filename: result.Item.filename,
      contentType: result.Item.contentType,
      tags: result.Item.tags,
      uploadedAt: result.Item.uploadedAt,
      status: result.Item.status,
      downloadUrl
    };

    console.log(`👁️ Retrieved image ${imageId} for user ${user.userId}`);
    return successResponse(response);

  } catch (error) {
    console.error('❌ Get image error:', error);
    return errorResponse(500, error.message);
  }
}

/**
 * Handle update image metadata
 */
async function handleUpdateImage(event) {
  try {
    const user = getUserFromEvent(event);
    const imageId = event.pathParameters?.imageId;
    const updateData = JSON.parse(event.body || '{}');

    if (!imageId) {
      return errorResponse(400, 'Image ID is required');
    }

    const { filename, tags } = updateData;
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (filename) {
      updateExpression.push('#filename = :filename');
      expressionAttributeNames['#filename'] = 'filename';
      expressionAttributeValues[':filename'] = filename;
    }

    if (tags) {
      updateExpression.push('#tags = :tags');
      updateExpression.push('searchableText = :searchableText');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = tags;
      expressionAttributeValues[':searchableText'] = createSearchableText(tags);

      // Update GSI1PK for tag-based search
      if (tags.predefined && tags.predefined.length > 0) {
        updateExpression.push('GSI1PK = :gsi1pk');
        expressionAttributeValues[':gsi1pk'] = `IMAGE_TAG#${tags.predefined[0]}`;
      }
    }

    updateExpression.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpression.length === 0) {
      return errorResponse(400, 'No valid fields to update');
    }

    await docClient.send(new UpdateCommand({
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: user.userPartition,
        SK: `IMAGE#${imageId}`
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ConditionExpression: 'attribute_exists(PK)' // Ensure image exists
    }));

    console.log(`✏️ Updated image ${imageId} for user ${user.userId}`);
    return successResponse({
      imageId,
      message: 'Image updated successfully'
    });

  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse(404, 'Image not found');
    }
    console.error('❌ Update image error:', error);
    return errorResponse(500, error.message);
  }
}

/**
 * Handle delete image
 */
async function handleDeleteImage(event) {
  try {
    const user = getUserFromEvent(event);
    const imageId = event.pathParameters?.imageId;

    if (!imageId) {
      return errorResponse(400, 'Image ID is required');
    }

    // Get image metadata first
    const getResult = await docClient.send(new GetCommand({
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: user.userPartition,
        SK: `IMAGE#${imageId}`
      }
    }));

    if (!getResult.Item) {
      return errorResponse(404, 'Image not found');
    }

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: getResult.Item.s3Key
    }));

    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: user.userPartition,
        SK: `IMAGE#${imageId}`
      }
    }));

    console.log(`🗑️ Deleted image ${imageId} for user ${user.userId}`);
    return successResponse({
      imageId,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete image error:', error);
    return errorResponse(500, error.message);
  }
}

/**
 * Handle search images by tags
 */
async function handleSearchImages(event) {
  try {
    const user = getUserFromEvent(event);
    const queryParams = event.queryStringParameters || {};
    const tags = queryParams.tags ? queryParams.tags.split(',') : [];
    const limit = parseInt(queryParams.limit) || 20;

    if (tags.length === 0) {
      return errorResponse(400, 'At least one tag is required for search');
    }

    if (!USE_DYNAMODB) {
      // Mock mode: Return filtered sample results
      console.log(`🧪 MOCK MODE: Searching images for tags: ${tags.join(', ')}`);
      const mockResults = [
        {
          imageId: 'search-result-1',
          filename: 'branded-logo.png',
          contentType: 'image/png',
          tags: { predefined: ['logo', 'brand'], custom: ['corporate'] },
          uploadedAt: new Date().toISOString(),
          status: 'uploaded'
        }
      ];

      // Simple mock filtering - if search contains 'logo', return logo results
      const filteredResults = mockResults.filter(item => {
        const allTags = [...item.tags.predefined, ...item.tags.custom];
        return tags.some(tag => allTags.includes(tag));
      });

      return successResponse({
        images: filteredResults.slice(0, limit),
        searchTags: tags,
        count: filteredResults.length
      });
    }

    // Use GSI1 to search by primary tag
    const primaryTag = tags[0];
    const searchParams = {
      TableName: DYNAMODB_TABLE,
      IndexName: 'TagSearchIndex',
      KeyConditionExpression: 'GSI1PK = :tagPK AND begins_with(GSI1SK, :userPrefix)',
      ExpressionAttributeValues: {
        ':tagPK': `IMAGE_TAG#${primaryTag}`,
        ':userPrefix': user.userPartition
      },
      Limit: limit
    };

    const result = await docClient.send(new QueryCommand(searchParams));
    const images = result.Items || [];

    // Filter by additional tags if provided
    let filteredImages = images;
    if (tags.length > 1) {
      filteredImages = images.filter(item => {
        const allTags = [...(item.tags?.predefined || []), ...(item.tags?.custom || [])];
        return tags.every(tag => allTags.includes(tag));
      });
    }

    const response = {
      images: filteredImages.map(item => ({
        imageId: item.imageId,
        filename: item.filename,
        contentType: item.contentType,
        tags: item.tags,
        uploadedAt: item.uploadedAt,
        status: item.status
      })),
      searchTags: tags,
      count: filteredImages.length
    };

    console.log(`🔍 Search found ${filteredImages.length} images for tags: ${tags.join(', ')}`);
    return successResponse(response);

  } catch (error) {
    console.error('❌ Search images error:', error);
    return errorResponse(500, error.message);
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  try {
    console.log('🖼️ Image Library API - Event:', JSON.stringify(event, null, 2));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const rawPath = event.rawPath || event.path;

    // Remove first path segment (/api) to get clean routing
    const path = rawPath.replace(/^\/[^\/]+/, '') || rawPath;

    console.log('🔍 DETAILED PATH ANALYSIS:');
    console.log('  - httpMethod:', httpMethod);
    console.log('  - rawPath:', rawPath);
    console.log('  - processed path:', path);
    console.log('  - event.path:', event.path);
    console.log('  - event.rawPath:', event.rawPath);
    console.log('  - requestContext path:', event.requestContext?.http?.path);
    console.log('🔍 Path processing rule: rawPath.replace(/^\/[^\/]+/, "") || rawPath');

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-amz-date,x-amz-security-token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    // Route requests
    if (httpMethod === 'POST' && path === '/images/upload') {
      return await handleImageUpload(event);
    }

    if (httpMethod === 'GET' && path === '/images') {
      return await handleListImages(event);
    }

    if (httpMethod === 'GET' && path === '/images/search') {
      return await handleSearchImages(event);
    }

    if (httpMethod === 'GET' && path.startsWith('/images/')) {
      return await handleGetImage(event);
    }

    if (httpMethod === 'PUT' && path.startsWith('/images/')) {
      return await handleUpdateImage(event);
    }

    if (httpMethod === 'DELETE' && path.startsWith('/images/')) {
      return await handleDeleteImage(event);
    }

    return errorResponse(404, 'Endpoint not found', {
      method: httpMethod,
      path: path,
      availableEndpoints: [
        'POST /api/images/upload',
        'GET /api/images',
        'GET /api/images/{imageId}',
        'PUT /api/images/{imageId}',
        'DELETE /api/images/{imageId}',
        'GET /api/images/search'
      ]
    });

  } catch (error) {
    console.error('💥 Image Library API - Unhandled error:', error);
    return errorResponse(500, 'Internal server error', {
      message: error.message
    });
  }
};

/**
 * Health check endpoint
 */
exports.health = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      service: 'TB365 Image Library API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stage: process.env.STAGE || 'unknown',
      version: '1.0.0',
      mode: USE_DYNAMODB ? 'production' : 'mock',
      config: {
        useDynamoDB: USE_DYNAMODB,
        dynamoTable: DYNAMODB_TABLE || 'not configured',
        s3Bucket: S3_BUCKET
      },
      endpoints: [
        'POST /api/images/upload',
        'GET /api/images',
        'GET /api/images/{imageId}',
        'PUT /api/images/{imageId}',
        'DELETE /api/images/{imageId}',
        'GET /api/images/search'
      ]
    })
  };
};