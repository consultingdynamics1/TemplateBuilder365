const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Buffer } = require('buffer');

const s3Client = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET;

// Helper function to get user ID from JWT
function getUserId(event) {
  if (!event.requestContext?.authorizer?.jwt?.claims?.sub) {
    throw new Error('User not authenticated');
  }
  return event.requestContext.authorizer.jwt.claims.sub;
}

// Helper function to get environment prefix
function getEnvironmentPrefix() {
  return 'stage'; // Fixed for this S3-only stack
}

// Helper function to create response
function createResponse(statusCode, body, contentType = 'application/json') {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

// Helper function to parse multipart form data
function parseMultipartData(body, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  const endBoundaryBuffer = Buffer.from('--' + boundary + '--');

  let bodyBuffer = Buffer.from(body, 'base64');
  let start = 0;

  while (start < bodyBuffer.length) {
    const boundaryIndex = bodyBuffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    const endBoundaryIndex = bodyBuffer.indexOf(endBoundaryBuffer, boundaryIndex + boundaryBuffer.length);

    let partEnd;
    if (nextBoundaryIndex !== -1 && (endBoundaryIndex === -1 || nextBoundaryIndex < endBoundaryIndex)) {
      partEnd = nextBoundaryIndex;
    } else if (endBoundaryIndex !== -1) {
      partEnd = endBoundaryIndex;
    } else {
      break;
    }

    if (partEnd > boundaryIndex + boundaryBuffer.length) {
      const partBuffer = bodyBuffer.slice(boundaryIndex + boundaryBuffer.length, partEnd);
      const headerEndIndex = partBuffer.indexOf('\r\n\r\n');

      if (headerEndIndex !== -1) {
        const headers = partBuffer.slice(0, headerEndIndex).toString();
        const content = partBuffer.slice(headerEndIndex + 4);

        // Parse headers to get field name and filename
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);

        if (nameMatch) {
          parts.push({
            name: nameMatch[1],
            filename: filenameMatch ? filenameMatch[1] : null,
            contentType: contentTypeMatch ? contentTypeMatch[1] : 'text/plain',
            data: content
          });
        }
      }
    }

    start = partEnd;
  }

  return parts;
}

// Helper function to get file extension from filename
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

// Helper function to get MIME type from extension
function getMimeType(extension) {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

exports.saveProject = async (event) => {
  try {
    console.log('Save project request:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();

    const body = JSON.parse(event.body);
    const { projectName, canvasState } = body;

    if (!projectName || !canvasState) {
      return createResponse(400, { error: 'Missing projectName or canvasState' });
    }

    // Create project data
    const projectData = {
      projectName,
      savedAt: new Date().toISOString(),
      version: '1.0',
      canvasState
    };

    // S3 key: environment/userId/projects/projectName/v1/template.tb365
    const s3Key = `${environment}/${userId}/projects/${projectName}/v1/template.tb365`;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(projectData, null, 2),
      ContentType: 'application/json',
      Metadata: {
        userId: userId,
        projectName: projectName,
        environment: environment
      }
    });

    await s3Client.send(putCommand);

    console.log(`Project saved successfully: ${s3Key}`);

    return createResponse(200, {
      success: true,
      message: 'Project saved successfully',
      projectName,
      s3Key
    });

  } catch (error) {
    console.error('Save project error:', error);
    return createResponse(500, {
      error: 'Failed to save project',
      details: error.message
    });
  }
};

exports.listProjects = async (event) => {
  try {
    console.log('List projects request:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();

    // List objects with prefix: environment/userId/projects/
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${environment}/${userId}/projects/`,
      Delimiter: '/'
    });

    const response = await s3Client.send(listCommand);

    // Extract project names from the common prefixes
    const projects = [];

    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        // Extract project name from: environment/userId/projects/PROJECT_NAME/
        const projectPath = prefix.Prefix;
        const projectName = projectPath.split('/')[3]; // Gets PROJECT_NAME from the path

        if (projectName) {
          projects.push({
            name: projectName,
            lastModified: null, // We'll get this from the actual file if needed
            path: projectPath
          });
        }
      }
    }

    console.log(`Found ${projects.length} projects for user ${userId}`);

    return createResponse(200, {
      success: true,
      projects
    });

  } catch (error) {
    console.error('List projects error:', error);
    return createResponse(500, {
      error: 'Failed to list projects',
      details: error.message
    });
  }
};

exports.loadProject = async (event) => {
  try {
    console.log('Load project request:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();
    const projectName = event.pathParameters?.projectName;

    if (!projectName) {
      return createResponse(400, { error: 'Missing projectName parameter' });
    }

    // S3 key: environment/userId/projects/projectName/v1/template.tb365
    const s3Key = `${environment}/${userId}/projects/${projectName}/v1/template.tb365`;

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3Client.send(getCommand);

    // Convert stream to string
    const bodyContents = await response.Body.transformToString();
    const projectData = JSON.parse(bodyContents);

    console.log(`Project loaded successfully: ${s3Key}`);

    return createResponse(200, {
      success: true,
      projectData
    });

  } catch (error) {
    console.error('Load project error:', error);

    if (error.name === 'NoSuchKey') {
      return createResponse(404, {
        error: 'Project not found',
        details: error.message
      });
    }

    return createResponse(500, {
      error: 'Failed to load project',
      details: error.message
    });
  }
};

exports.deleteProject = async (event) => {
  try {
    console.log('Delete project request:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();
    const projectName = event.pathParameters?.projectName;

    if (!projectName) {
      return createResponse(400, { error: 'Missing projectName parameter' });
    }

    // S3 key: environment/userId/projects/projectName/v1/template.tb365
    const s3Key = `${environment}/${userId}/projects/${projectName}/v1/template.tb365`;

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await s3Client.send(deleteCommand);

    console.log(`Project deleted successfully: ${s3Key}`);

    return createResponse(200, {
      success: true,
      message: 'Project deleted successfully',
      projectName
    });

  } catch (error) {
    console.error('Delete project error:', error);
    return createResponse(500, {
      error: 'Failed to delete project',
      details: error.message
    });
  }
};

// Image Upload Endpoint (Stage/Production only - Dev uses blob URLs)
exports.uploadImage = async (event) => {
  try {
    console.log('Upload image request:', JSON.stringify({ ...event, body: '[BINARY_DATA]' }, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();
    const projectName = event.pathParameters?.projectName;

    if (!projectName) {
      return createResponse(400, { error: 'Missing projectName parameter' });
    }

    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return createResponse(400, { error: 'Content-Type must be multipart/form-data' });
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return createResponse(400, { error: 'Missing boundary in Content-Type' });
    }

    const parts = parseMultipartData(event.body, boundary);
    const imagePart = parts.find(part => part.filename && part.data);

    if (!imagePart) {
      return createResponse(400, { error: 'No image file found in request' });
    }

    const { filename, data } = imagePart;
    const fileExtension = getFileExtension(filename);
    const mimeType = getMimeType(fileExtension);

    // Validate file type
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!allowedExtensions.includes(fileExtension)) {
      return createResponse(400, {
        error: 'Invalid file type',
        allowedTypes: allowedExtensions
      });
    }

    // Check if image already exists
    const s3Key = `${environment}/${userId}/projects/${projectName}/images/${filename}`;
    let imageExists = false;
    try {
      await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
      imageExists = true;
    } catch (error) {
      // Image doesn't exist, which is fine
    }

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: data,
      ContentType: mimeType,
      Metadata: {
        userId: userId,
        projectName: projectName,
        environment: environment,
        originalFilename: filename,
        uploadedAt: new Date().toISOString()
      }
    });

    await s3Client.send(putCommand);

    // Generate the S3 URL for the uploaded image
    const imageUrl = `https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com/${s3Key}`;

    console.log(`Image uploaded successfully: ${s3Key}`);

    return createResponse(200, {
      success: true,
      message: imageExists ? 'Image replaced successfully' : 'Image uploaded successfully',
      imageUrl,
      filename,
      s3Key,
      existed: imageExists
    });

  } catch (error) {
    console.error('Upload image error:', error);
    return createResponse(500, {
      error: 'Failed to upload image',
      details: error.message
    });
  }
};

// List Project Images Endpoint (Stage/Production only)
exports.listImages = async (event) => {
  try {
    console.log('List images request:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();
    const projectName = event.pathParameters?.projectName;

    if (!projectName) {
      return createResponse(400, { error: 'Missing projectName parameter' });
    }

    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${environment}/${userId}/projects/${projectName}/images/`
    });

    const response = await s3Client.send(listCommand);

    const images = [];
    if (response.Contents) {
      for (const object of response.Contents) {
        const filename = object.Key.split('/').pop();
        if (filename) {
          const imageUrl = `https://${BUCKET_NAME}.s3.us-east-1.amazonaws.com/${object.Key}`;
          images.push({
            filename,
            url: imageUrl,
            size: object.Size,
            lastModified: object.LastModified,
            s3Key: object.Key
          });
        }
      }
    }

    console.log(`Found ${images.length} images for project ${projectName}`);

    return createResponse(200, {
      success: true,
      images,
      projectName
    });

  } catch (error) {
    console.error('List images error:', error);
    return createResponse(500, {
      error: 'Failed to list images',
      details: error.message
    });
  }
};

// Delete Project Image Endpoint (Stage/Production only)
exports.deleteImage = async (event) => {
  try {
    console.log('Delete image request:', JSON.stringify(event, null, 2));

    const userId = getUserId(event);
    const environment = getEnvironmentPrefix();
    const projectName = event.pathParameters?.projectName;
    const imageName = event.pathParameters?.imageName;

    if (!projectName) {
      return createResponse(400, { error: 'Missing projectName parameter' });
    }

    if (!imageName) {
      return createResponse(400, { error: 'Missing imageName parameter' });
    }

    const s3Key = `${environment}/${userId}/projects/${projectName}/images/${imageName}`;

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await s3Client.send(deleteCommand);

    console.log(`Image deleted successfully: ${s3Key}`);

    return createResponse(200, {
      success: true,
      message: 'Image deleted successfully',
      imageName,
      projectName
    });

  } catch (error) {
    console.error('Delete image error:', error);
    return createResponse(500, {
      error: 'Failed to delete image',
      details: error.message
    });
  }
};