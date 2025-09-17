/**
 * Project Manager with AWS SDK v3
 * This version uses the modern AWS SDK v3 with dependencies included
 */

// AWS SDK v3 imports
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
// Simple UUID alternative (no external dependencies)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Initialize S3 client v3
const s3Client = new S3Client({ region: process.env.REGION || 'us-east-1' });

// Helper function to convert stream to string (for AWS SDK v3)
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Simple response helpers (no external dependencies)
function successResponse(data) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  };
}

function errorResponse(statusCode, message, details = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: message,
      ...details
    })
  };
}

// Generate unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Extract user from JWT (simplified)
function extractUserFromJWT(event) {
  try {
    const jwt = event.requestContext?.authorizer?.jwt;
    if (!jwt) {
      return {
        success: false,
        reason: 'No JWT found in request context',
        message: 'Authentication required'
      };
    }

    const userId = jwt.claims?.sub || 'test-user';
    const userEmail = jwt.claims?.email || 'test@example.com';

    return {
      success: true,
      userId,
      userEmail
    };
  } catch (error) {
    return {
      success: false,
      reason: `JWT parsing error: ${error.message}`,
      message: 'Authentication token invalid'
    };
  }
}

// S3 Operations
async function saveProjectToS3(userId, projectName, canvasState) {
  const bucket = 'templatebuilder365-user-data';
  const stage = process.env.STAGE || 'dev';

  // Generate version
  const version = `v${Date.now()}`;
  const savedAt = new Date().toISOString();

  // Project data
  const projectData = {
    projectName,
    canvasState,
    version,
    savedAt,
    userId
  };

  // S3 key for the project version
  const key = `${stage}/${userId}/projects/${projectName}/${version}/template.tb365`;

  // Upload to S3
  const params = {
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(projectData, null, 2),
    ContentType: 'application/json',
    Metadata: {
      userId: userId,
      projectName: projectName,
      version: version,
      savedAt: savedAt
    }
  };

  await s3Client.send(new PutObjectCommand(params));

  // Update current.json pointer
  const currentKey = `${stage}/${userId}/projects/${projectName}/current.json`;
  const currentData = {
    version: version,
    lastSaved: savedAt,
    projectName: projectName
  };

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: currentKey,
    Body: JSON.stringify(currentData, null, 2),
    ContentType: 'application/json'
  }));

  console.log(`✅ Saved project to S3: ${key}`);

  return {
    version,
    savedAt,
    s3Key: key
  };
}

async function loadProjectFromS3(userId, projectName) {
  const bucket = 'templatebuilder365-user-data';
  const stage = process.env.STAGE || 'dev';

  try {
    // Get current version pointer
    const currentKey = `${stage}/${userId}/projects/${projectName}/current.json`;
    const currentResult = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: currentKey
    }));

    const currentBody = await streamToString(currentResult.Body);
    const currentData = JSON.parse(currentBody);
    const version = currentData.version;

    // Load the actual project file
    const projectKey = `${stage}/${userId}/projects/${projectName}/${version}/template.tb365`;
    const projectResult = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: projectKey
    }));

    const projectBody = await streamToString(projectResult.Body);
    const projectData = JSON.parse(projectBody);

    console.log(`✅ Loaded project from S3: ${projectKey}`);

    return projectData;
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      throw new Error('Project not found');
    }
    throw error;
  }
}

async function listProjectsFromS3(userId) {
  const bucket = 'templatebuilder365-user-data';
  const stage = process.env.STAGE || 'dev';

  const prefix = `${stage}/${userId}/projects/`;

  try {
    const result = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/'
    }));

    const projects = [];

    // Look for project folders
    if (result.CommonPrefixes) {
      for (const prefixInfo of result.CommonPrefixes) {
        const projectPath = prefixInfo.Prefix;
        const projectName = projectPath.replace(prefix, '').replace('/', '');

        try {
          // Try to get current.json for this project
          const currentKey = `${projectPath}current.json`;
          const currentResult = await s3Client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: currentKey
          }));

          const currentBody = await streamToString(currentResult.Body);
          const currentData = JSON.parse(currentBody);

          projects.push({
            name: projectName,
            lastModified: currentData.lastSaved,
            version: currentData.version,
            size: currentResult.ContentLength || 0
          });
        } catch (error) {
          // Skip projects without current.json
          console.warn(`No current.json for project: ${projectName}`);
        }
      }
    }

    console.log(`✅ Listed ${projects.length} projects from S3`);

    return projects;
  } catch (error) {
    console.error('Error listing projects:', error);
    return [];
  }
}

async function deleteProjectFromS3(userId, projectName) {
  const bucket = 'templatebuilder365-user-data';
  const stage = process.env.STAGE || 'dev';

  const prefix = `${stage}/${userId}/projects/${projectName}/`;

  try {
    // List all objects for this project
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    }));

    if (listResult.Contents && listResult.Contents.length > 0) {
      // Delete all objects
      const deleteParams = {
        Bucket: bucket,
        Delete: {
          Objects: listResult.Contents.map(obj => ({ Key: obj.Key }))
        }
      };

      await s3Client.send(new DeleteObjectsCommand(deleteParams));
      console.log(`✅ Deleted project from S3: ${prefix}`);
    }
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      throw new Error('Project not found');
    }
    throw error;
  }
}

// Main handler
exports.handler = async (event) => {
  try {
    console.log('🗂️ Project Manager (S3) - Full event:', JSON.stringify(event, null, 2));

    // API Gateway V2 (HTTP API) uses different event structure
    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const rawPath = event.rawPath || event.path;
    const pathParameters = event.pathParameters;
    const body = event.body;

    // Remove stage prefix from path
    const path = rawPath.replace(/^\/stage/, '') || rawPath;

    console.log('🔍 Parsed event data:', { httpMethod, rawPath, path, pathParameters });

    // Health check (no auth required)
    if (httpMethod === 'GET' && path === '/api/projects/health') {
      return successResponse({
        service: 'TB365 Project Manager (Real S3)',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stage: process.env.STAGE || 'unknown',
        version: 'sdk-v2-s3',
        bucket: 'templatebuilder365-user-data'
      });
    }

    // All other endpoints require auth (but we'll mock it for testing)
    const userInfo = extractUserFromJWT(event);
    if (!userInfo.success) {
      // For testing, use mock user
      userInfo.userId = 'test-user-123';
      userInfo.userEmail = 'test@templatebuilder365.com';
    }

    const { userId } = userInfo;

    // Handle different endpoints
    if (httpMethod === 'POST' && path === '/api/projects/save') {
      try {
        const { projectName, canvasState } = JSON.parse(body || '{}');

        if (!projectName || !canvasState) {
          return errorResponse(400, 'projectName and canvasState are required');
        }

        const result = await saveProjectToS3(userId, projectName, canvasState);

        console.log(`💾 S3 Save: ${projectName} for ${userId} (${result.version})`);

        return successResponse({
          message: 'Project saved successfully to S3',
          projectName,
          version: result.version,
          savedAt: result.savedAt,
          userId,
          s3Key: result.s3Key
        });
      } catch (error) {
        console.error('Save error:', error);
        return errorResponse(500, 'Failed to save project to S3', { error: error.message });
      }
    }

    if (httpMethod === 'GET' && path === '/api/projects/list') {
      try {
        const projects = await listProjectsFromS3(userId);

        console.log(`📋 S3 List: Found ${projects.length} projects for ${userId}`);

        return successResponse({
          projects,
          userId,
          count: projects.length
        });
      } catch (error) {
        console.error('List error:', error);
        return errorResponse(500, 'Failed to list projects from S3', { error: error.message });
      }
    }

    if (httpMethod === 'GET' && path.startsWith('/api/projects/load/')) {
      const projectName = pathParameters?.name;
      if (!projectName) {
        return errorResponse(400, 'Project name is required');
      }

      try {
        const project = await loadProjectFromS3(userId, projectName);

        console.log(`📂 S3 Load: ${projectName} for ${userId} (${project.version})`);

        return successResponse({
          projectName: project.projectName,
          canvasState: project.canvasState,
          version: project.version,
          savedAt: project.savedAt,
          userId
        });
      } catch (error) {
        console.error('Load error:', error);

        if (error.message === 'Project not found') {
          return errorResponse(404, 'Project not found', { projectName, userId });
        }

        return errorResponse(500, 'Failed to load project from S3', { error: error.message });
      }
    }

    if (httpMethod === 'DELETE' && path.startsWith('/api/projects/')) {
      const projectName = pathParameters?.name;
      if (!projectName) {
        return errorResponse(400, 'Project name is required');
      }

      try {
        await deleteProjectFromS3(userId, projectName);
        console.log(`🗑️ S3 Delete: ${projectName} for ${userId}`);

        return successResponse({
          message: 'Project deleted successfully from S3',
          projectName,
          userId
        });
      } catch (error) {
        console.error('Delete error:', error);

        if (error.message === 'Project not found') {
          return errorResponse(404, 'Project not found', { projectName, userId });
        }

        return errorResponse(500, 'Failed to delete project from S3', { error: error.message });
      }
    }

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    return errorResponse(404, 'Endpoint not found', {
      method: httpMethod,
      path: path,
      availableEndpoints: [
        'GET /api/projects/health',
        'POST /api/projects/save',
        'GET /api/projects/list',
        'GET /api/projects/load/{name}',
        'DELETE /api/projects/{name}'
      ]
    });

  } catch (error) {
    console.error('💥 Project Manager - Unhandled error:', error);
    return errorResponse(500, 'Internal server error', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};