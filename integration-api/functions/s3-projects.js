const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
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