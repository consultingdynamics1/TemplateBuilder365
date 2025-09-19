#!/usr/bin/env node

/**
 * Mock API server for testing frontend Lambda integration locally
 * Simulates the project-manager Lambda endpoints
 */

const http = require('http');
const url = require('url');

const PORT = 3000;

// Mock user data storage
const mockProjects = new Map();

// Helper to get mock user ID
function getMockUserId(req) {
  // In development mode, we use a consistent mock user ID
  return 'dev-user-id';
}

// Helper to create success response
function successResponse(data) {
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

// Helper to create error response
function errorResponse(statusCode, message, details = {}) {
  return {
    statusCode,
    body: JSON.stringify({
      error: message,
      ...details
    })
  };
}

// Mock save project
function handleSaveProject(req, body) {
  try {
    const { projectName, canvasState } = JSON.parse(body);

    if (!projectName || !canvasState) {
      return errorResponse(400, 'projectName and canvasState are required');
    }

    const userId = getMockUserId(req);
    const projectKey = `${userId}:${projectName}`;

    // Get existing project or create new one
    const existingProject = mockProjects.get(projectKey) || { versions: [] };

    // Create new version
    const newVersion = `v${existingProject.versions.length + 1}`;
    const savedAt = new Date().toISOString();

    const projectData = {
      projectName,
      canvasState,
      version: newVersion,
      savedAt,
      userId
    };

    existingProject.versions.push(projectData);
    existingProject.current = projectData;
    mockProjects.set(projectKey, existingProject);

    console.log(`💾 Mock Save: ${projectName} for ${userId} (${newVersion})`);

    return successResponse({
      message: 'Project saved successfully',
      projectName,
      version: newVersion,
      savedAt,
      userId
    });
  } catch (error) {
    console.error('Mock save error:', error);
    return errorResponse(500, 'Failed to save project', { error: error.message });
  }
}

// Mock load project
function handleLoadProject(req, projectName) {
  try {
    const userId = getMockUserId(req);
    const projectKey = `${userId}:${projectName}`;

    const project = mockProjects.get(projectKey);
    if (!project || !project.current) {
      return errorResponse(404, 'Project not found', { projectName, userId });
    }

    console.log(`📂 Mock Load: ${projectName} for ${userId} (${project.current.version})`);

    return successResponse({
      projectName: project.current.projectName,
      canvasState: project.current.canvasState,
      version: project.current.version,
      savedAt: project.current.savedAt,
      userId
    });
  } catch (error) {
    console.error('Mock load error:', error);
    return errorResponse(500, 'Failed to load project', { error: error.message });
  }
}

// Mock list projects
function handleListProjects(req) {
  try {
    const userId = getMockUserId(req);
    const userProjects = [];

    for (const [key, project] of mockProjects) {
      if (key.startsWith(`${userId}:`)) {
        const projectName = key.replace(`${userId}:`, '');
        userProjects.push({
          name: projectName,
          lastModified: project.current.savedAt,
          version: project.current.version,
          size: JSON.stringify(project.current.canvasState).length
        });
      }
    }

    console.log(`📋 Mock List: Found ${userProjects.length} projects for ${userId}`);

    return successResponse({
      projects: userProjects,
      userId,
      count: userProjects.length
    });
  } catch (error) {
    console.error('Mock list error:', error);
    return errorResponse(500, 'Failed to list projects', { error: error.message });
  }
}

// Mock delete project
function handleDeleteProject(req, projectName) {
  try {
    const userId = getMockUserId(req);
    const projectKey = `${userId}:${projectName}`;

    if (!mockProjects.has(projectKey)) {
      return errorResponse(404, 'Project not found', { projectName, userId });
    }

    mockProjects.delete(projectKey);
    console.log(`🗑️ Mock Delete: ${projectName} for ${userId}`);

    return successResponse({
      message: 'Project deleted successfully',
      projectName,
      userId
    });
  } catch (error) {
    console.error('Mock delete error:', error);
    return errorResponse(500, 'Failed to delete project', { error: error.message });
  }
}

// Mock health check
function handleHealthCheck() {
  return successResponse({
    service: 'Mock TB365 Project Manager',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stage: 'development-mock'
  });
}

// Main request handler
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  console.log(`🌐 Mock API: ${method} ${path}`);

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    let response;

    if (method === 'POST' && path === '/api/projects/save') {
      response = handleSaveProject(req, body);
    } else if (method === 'GET' && path === '/api/projects/list') {
      response = handleListProjects(req);
    } else if (method === 'GET' && path.startsWith('/api/projects/load/')) {
      const projectName = decodeURIComponent(path.replace('/api/projects/load/', ''));
      response = handleLoadProject(req, projectName);
    } else if (method === 'DELETE' && path.startsWith('/api/projects/')) {
      const projectName = decodeURIComponent(path.replace('/api/projects/', ''));
      response = handleDeleteProject(req, projectName);
    } else if (method === 'GET' && path === '/api/projects/health') {
      response = handleHealthCheck();
    } else {
      response = errorResponse(404, 'Endpoint not found', {
        method,
        path,
        availableEndpoints: [
          'POST /api/projects/save',
          'GET /api/projects/list',
          'GET /api/projects/load/{name}',
          'DELETE /api/projects/{name}',
          'GET /api/projects/health'
        ]
      });
    }

    res.statusCode = response.statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(response.body);
  });
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`🚀 Mock API Server started on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  POST   /api/projects/save');
  console.log('  GET    /api/projects/list');
  console.log('  GET    /api/projects/load/{name}');
  console.log('  DELETE /api/projects/{name}');
  console.log('  GET    /api/projects/health');
  console.log('');
  console.log('💾 Mock storage: In-memory (will reset on restart)');
  console.log('👤 Mock user: dev-user-id');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock API server...');
  server.close(() => {
    console.log('✅ Mock API server stopped');
    process.exit(0);
  });
});