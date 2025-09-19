const { s3Client } = require('../utils/s3-client');
const { successResponse, errorResponse, unauthorizedResponse } = require('../utils/response-helper');
const { v4: uuidv4 } = require('uuid');

/**
 * Project Management Lambda handler for TB365 cloud storage
 * Handles save/load/list/delete operations for user projects
 */
exports.handler = async (event) => {
  try {
    console.log('🗂️ Project Manager - Received event:', {
      httpMethod: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
      headers: Object.keys(event.headers || {}),
      bodySize: event.body ? event.body.length : 0,
      jwt: event.requestContext?.authorizer?.jwt ? 'present' : 'missing'
    });

    // Extract JWT user info from Cognito authorizer
    const userInfo = extractUserFromJWT(event);
    if (!userInfo.success) {
      console.warn('❌ JWT extraction failed:', userInfo.reason);
      return unauthorizedResponse(userInfo.message);
    }

    const { userId, userEmail } = userInfo;
    console.log(`👤 Authenticated user: ${userEmail} (${userId})`);

    // Route handling
    const { httpMethod, path, pathParameters, body } = event;

    if (httpMethod === 'POST' && path === '/api/projects/save') {
      return await handleSaveProject(userId, body);
    } else if (httpMethod === 'GET' && path === '/api/projects/list') {
      return await handleListProjects(userId);
    } else if (httpMethod === 'GET' && path.startsWith('/api/projects/load/')) {
      const projectName = pathParameters?.name;
      return await handleLoadProject(userId, projectName);
    } else if (httpMethod === 'DELETE' && path.startsWith('/api/projects/')) {
      const projectName = pathParameters?.name;
      return await handleDeleteProject(userId, projectName);
    } else if (httpMethod === 'OPTIONS') {
      return handleOptionsRequest();
    }

    return errorResponse(400, 'Invalid request method or path', {
      method: httpMethod,
      path: path,
      availableEndpoints: [
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

/**
 * Extract user information from JWT token (set by Cognito authorizer)
 */
function extractUserFromJWT(event) {
  try {
    // Cognito authorizer should populate this in requestContext
    const jwt = event.requestContext?.authorizer?.jwt;
    if (!jwt) {
      return {
        success: false,
        reason: 'No JWT found in request context',
        message: 'Authentication required'
      };
    }

    // Extract user ID and email from JWT claims
    const userId = jwt.claims?.sub;
    const userEmail = jwt.claims?.email;

    if (!userId) {
      return {
        success: false,
        reason: 'No user ID in JWT claims',
        message: 'Invalid authentication token'
      };
    }

    return {
      success: true,
      userId,
      userEmail: userEmail || 'unknown@templatebuilder365.com'
    };

  } catch (error) {
    console.error('JWT extraction error:', error);
    return {
      success: false,
      reason: `JWT parsing error: ${error.message}`,
      message: 'Authentication token invalid'
    };
  }
}

/**
 * Save project to S3 with versioning
 */
async function handleSaveProject(userId, requestBody) {
  try {
    if (!requestBody) {
      return errorResponse(400, 'Request body required');
    }

    const { projectName, canvasState } = JSON.parse(requestBody);

    if (!projectName || !canvasState) {
      return errorResponse(400, 'projectName and canvasState are required');
    }

    console.log(`💾 Saving project "${projectName}" for user ${userId}`);

    // Use the stage from environment (dev/stage/prod)
    const stage = process.env.STAGE || 'dev';
    const bucket = `templatebuilder365-user-data`;

    // Save project using existing s3Client with versioning
    const result = await s3Client.saveProject(userId, projectName, canvasState, {
      bucket,
      environment: stage
    });

    console.log(`✅ Project saved successfully:`, result);

    return successResponse({
      message: 'Project saved successfully',
      projectName,
      version: result.version,
      savedAt: result.savedAt,
      userId: userId
    });

  } catch (error) {
    console.error('❌ Save project error:', error);
    return errorResponse(500, 'Failed to save project', {
      error: error.message
    });
  }
}

/**
 * List user's projects from S3
 */
async function handleListProjects(userId) {
  try {
    console.log(`📋 Listing projects for user ${userId}`);

    const stage = process.env.STAGE || 'dev';
    const bucket = `templatebuilder365-user-data`;

    // List projects for user
    const projects = await s3Client.listProjects(userId, {
      bucket,
      environment: stage
    });

    console.log(`✅ Found ${projects.length} projects for user ${userId}`);

    return successResponse({
      projects,
      userId,
      count: projects.length
    });

  } catch (error) {
    console.error('❌ List projects error:', error);
    return errorResponse(500, 'Failed to list projects', {
      error: error.message
    });
  }
}

/**
 * Load specific project from S3
 */
async function handleLoadProject(userId, projectName) {
  try {
    if (!projectName) {
      return errorResponse(400, 'Project name is required');
    }

    console.log(`📂 Loading project "${projectName}" for user ${userId}`);

    const stage = process.env.STAGE || 'dev';
    const bucket = `templatebuilder365-user-data`;

    // Load project from S3
    const project = await s3Client.loadProject(userId, projectName, {
      bucket,
      environment: stage
    });

    console.log(`✅ Project loaded successfully: ${projectName}`);

    return successResponse({
      projectName,
      ...project,
      userId
    });

  } catch (error) {
    console.error('❌ Load project error:', error);

    if (error.code === 'NoSuchKey') {
      return errorResponse(404, 'Project not found', {
        projectName,
        userId
      });
    }

    return errorResponse(500, 'Failed to load project', {
      error: error.message,
      projectName
    });
  }
}

/**
 * Delete project from S3
 */
async function handleDeleteProject(userId, projectName) {
  try {
    if (!projectName) {
      return errorResponse(400, 'Project name is required');
    }

    console.log(`🗑️ Deleting project "${projectName}" for user ${userId}`);

    const stage = process.env.STAGE || 'dev';
    const bucket = `templatebuilder365-user-data`;

    // Delete project from S3
    await s3Client.deleteProject(userId, projectName, {
      bucket,
      environment: stage
    });

    console.log(`✅ Project deleted successfully: ${projectName}`);

    return successResponse({
      message: 'Project deleted successfully',
      projectName,
      userId
    });

  } catch (error) {
    console.error('❌ Delete project error:', error);

    if (error.code === 'NoSuchKey') {
      return errorResponse(404, 'Project not found', {
        projectName,
        userId
      });
    }

    return errorResponse(500, 'Failed to delete project', {
      error: error.message,
      projectName
    });
  }
}

/**
 * Handle CORS preflight requests
 */
function handleOptionsRequest() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
}

/**
 * Health check endpoint
 */
exports.health = async (event) => {
  return successResponse({
    service: 'TB365 Project Manager',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stage: process.env.STAGE || 'unknown'
  });
};