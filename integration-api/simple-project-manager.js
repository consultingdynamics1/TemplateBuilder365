/**
 * Simplified Project Manager for testing API Gateway integration
 * This version works without external dependencies for initial testing
 */

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

// Simple UUID generator (no dependencies)
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Mock storage (in-memory for testing)
const mockStorage = new Map();

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

// Main handler
exports.handler = async (event) => {
  try {
    console.log('🗂️ Simple Project Manager - Full event:', JSON.stringify(event, null, 2));

    console.log('🗂️ Simple Project Manager - Received event:', {
      httpMethod: event.httpMethod,
      path: event.path,
      rawPath: event.rawPath,
      routeKey: event.routeKey,
      pathParameters: event.pathParameters,
      headers: Object.keys(event.headers || {}),
      bodySize: event.body ? event.body.length : 0
    });

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
        service: 'TB365 Project Manager (Simplified)',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stage: process.env.STAGE || 'unknown',
        version: 'test-1.0'
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

        // Mock save to in-memory storage
        const projectKey = `${userId}:${projectName}`;
        const version = `v${Date.now()}`;
        const savedAt = new Date().toISOString();

        mockStorage.set(projectKey, {
          projectName,
          canvasState,
          version,
          savedAt,
          userId
        });

        console.log(`💾 Mock Save: ${projectName} for ${userId} (${version})`);

        return successResponse({
          message: 'Project saved successfully (mock storage)',
          projectName,
          version,
          savedAt,
          userId
        });
      } catch (error) {
        return errorResponse(500, 'Failed to save project', { error: error.message });
      }
    }

    if (httpMethod === 'GET' && path === '/api/projects/list') {
      const userProjects = [];
      for (const [key, project] of mockStorage) {
        if (key.startsWith(`${userId}:`)) {
          const projectName = key.replace(`${userId}:`, '');
          userProjects.push({
            name: projectName,
            lastModified: project.savedAt,
            version: project.version,
            size: JSON.stringify(project.canvasState).length
          });
        }
      }

      console.log(`📋 Mock List: Found ${userProjects.length} projects for ${userId}`);

      return successResponse({
        projects: userProjects,
        userId,
        count: userProjects.length
      });
    }

    if (httpMethod === 'GET' && path.startsWith('/api/projects/load/')) {
      const projectName = pathParameters?.name;
      if (!projectName) {
        return errorResponse(400, 'Project name is required');
      }

      const projectKey = `${userId}:${projectName}`;
      const project = mockStorage.get(projectKey);

      if (!project) {
        return errorResponse(404, 'Project not found', { projectName, userId });
      }

      console.log(`📂 Mock Load: ${projectName} for ${userId} (${project.version})`);

      return successResponse({
        projectName: project.projectName,
        canvasState: project.canvasState,
        version: project.version,
        savedAt: project.savedAt,
        userId
      });
    }

    if (httpMethod === 'DELETE' && path.startsWith('/api/projects/')) {
      const projectName = pathParameters?.name;
      if (!projectName) {
        return errorResponse(400, 'Project name is required');
      }

      const projectKey = `${userId}:${projectName}`;
      if (!mockStorage.has(projectKey)) {
        return errorResponse(404, 'Project not found', { projectName, userId });
      }

      mockStorage.delete(projectKey);
      console.log(`🗑️ Mock Delete: ${projectName} for ${userId}`);

      return successResponse({
        message: 'Project deleted successfully (mock storage)',
        projectName,
        userId
      });
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