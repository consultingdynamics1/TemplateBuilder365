const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

/**
 * S3 Client utilities for handling file operations
 */
class S3ClientWrapper {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.REGION || 'us-east-1'
    });
  }

  /**
   * Upload an object to S3
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @param {string|Buffer} body - Object body
   * @param {string} contentType - Content type
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadObject(bucket, key, body, contentType = 'application/json', metadata = {}) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      });

      const result = await this.s3Client.send(command);
      
      console.log(`Successfully uploaded ${key} to ${bucket}`);
      
      return {
        success: true,
        bucket,
        key,
        etag: result.ETag,
        location: `s3://${bucket}/${key}`
      };
    } catch (error) {
      console.error(`Error uploading ${key} to ${bucket}:`, error);
      throw new Error(`Failed to upload object: ${error.message}`);
    }
  }

  /**
   * Get an object from S3
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @returns {Promise<Object>} Object data
   */
  async getObject(bucket, key) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const result = await this.s3Client.send(command);
      
      // Convert stream to string for JSON objects
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      
      const body = Buffer.concat(chunks).toString('utf-8');
      
      return {
        body,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        contentLength: result.ContentLength,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error(`Error getting ${key} from ${bucket}:`, error);
      throw new Error(`Failed to get object: ${error.message}`);
    }
  }

  /**
   * Check if an object exists in S3
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @returns {Promise<boolean>} Whether object exists
   */
  async objectExists(bucket, key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error(`Error checking if ${key} exists in ${bucket}:`, error);
      throw new Error(`Failed to check object existence: ${error.message}`);
    }
  }

  /**
   * Get object metadata
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @returns {Promise<Object>} Object metadata
   */
  async getObjectMetadata(bucket, key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const result = await this.s3Client.send(command);
      
      return {
        ContentLength: result.ContentLength,
        ContentType: result.ContentType,
        LastModified: result.LastModified,
        ETag: result.ETag,
        Metadata: result.Metadata
      };
    } catch (error) {
      console.error(`Error getting metadata for ${key} in ${bucket}:`, error);
      throw new Error(`Failed to get object metadata: ${error.message}`);
    }
  }

  /**
   * Delete an object from S3
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @returns {Promise<Object>} Delete result
   */
  async deleteObject(bucket, key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      });

      await this.s3Client.send(command);
      
      console.log(`Successfully deleted ${key} from ${bucket}`);
      
      return {
        success: true,
        bucket,
        key,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error deleting ${key} from ${bucket}:`, error);
      throw new Error(`Failed to delete object: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for downloading an object
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
   * @returns {Promise<string>} Presigned URL
   */
  async generatePresignedUrl(bucket, key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      console.log(`Generated presigned URL for ${key} (expires in ${expiresIn}s)`);
      
      return url;
    } catch (error) {
      console.error(`Error generating presigned URL for ${key}:`, error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for uploading an object
   * @param {string} bucket - S3 bucket name
   * @param {string} key - Object key
   * @param {string} contentType - Content type
   * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
   * @returns {Promise<string>} Presigned URL
   */
  async generatePresignedUploadUrl(bucket, key, contentType = 'application/json', expiresIn = 3600) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      console.log(`Generated presigned upload URL for ${key} (expires in ${expiresIn}s)`);
      
      return url;
    } catch (error) {
      console.error(`Error generating presigned upload URL for ${key}:`, error);
      throw new Error(`Failed to generate presigned upload URL: ${error.message}`);
    }
  }

  // === PROJECT MANAGEMENT METHODS ===

  /**
   * Save a TB365 project with versioning
   * @param {string} userId - User ID from JWT
   * @param {string} projectName - Project name
   * @param {Object} canvasState - Canvas state data
   * @param {Object} options - Options (bucket, environment)
   * @returns {Promise<Object>} Save result with version info
   */
  async saveProject(userId, projectName, canvasState, options = {}) {
    const { bucket = 'templatebuilder365-user-data', environment = 'dev' } = options;

    try {
      console.log(`💾 Saving project: ${projectName} for user: ${userId} in environment: ${environment}`);

      // Generate project structure: /{environment}/{userId}/projects/{projectName}/
      const projectPath = `${environment}/${userId}/projects/${projectName}`;

      // Get next version number
      const currentVersion = await this.getCurrentProjectVersion(bucket, projectPath);
      const nextVersion = this.getNextVersion(currentVersion);

      // Create project data with metadata
      const projectData = {
        projectName,
        savedAt: new Date().toISOString(),
        version: '1.0',
        userId,
        environment,
        versionNumber: nextVersion,
        canvasState
      };

      // Save versioned project file
      const versionedKey = `${projectPath}/${nextVersion}/template.tb365`;
      await this.uploadObject(bucket, versionedKey, JSON.stringify(projectData, null, 2), 'application/json', {
        projectName,
        userId,
        version: nextVersion,
        environment
      });

      // Update current.json pointer
      const currentData = {
        version: nextVersion,
        lastSaved: new Date().toISOString(),
        restoredFrom: null,
        metadata: {
          projectName,
          canvasSize: canvasState.canvasSize || { width: 794, height: 1123 },
          elementCount: canvasState.elements ? canvasState.elements.length : 0,
          lastModified: new Date().toISOString()
        }
      };

      const currentKey = `${projectPath}/current.json`;
      await this.uploadObject(bucket, currentKey, JSON.stringify(currentData, null, 2), 'application/json');

      // Clean up old versions (keep last 3)
      await this.cleanupOldVersions(bucket, projectPath, 3);

      console.log(`✅ Project saved successfully: ${projectName} version ${nextVersion}`);

      return {
        success: true,
        projectName,
        version: nextVersion,
        savedAt: projectData.savedAt,
        bucket,
        key: versionedKey
      };

    } catch (error) {
      console.error(`❌ Error saving project ${projectName}:`, error);
      throw new Error(`Failed to save project: ${error.message}`);
    }
  }

  /**
   * Load a TB365 project
   * @param {string} userId - User ID from JWT
   * @param {string} projectName - Project name
   * @param {Object} options - Options (bucket, environment)
   * @returns {Promise<Object>} Project data
   */
  async loadProject(userId, projectName, options = {}) {
    const { bucket = 'templatebuilder365-user-data', environment = 'dev' } = options;

    try {
      console.log(`📂 Loading project: ${projectName} for user: ${userId} in environment: ${environment}`);

      const projectPath = `${environment}/${userId}/projects/${projectName}`;

      // Get current version info
      const currentKey = `${projectPath}/current.json`;
      const currentData = await this.getObject(bucket, currentKey);
      const current = JSON.parse(currentData.body);

      // Load the current version
      const versionedKey = `${projectPath}/${current.version}/template.tb365`;
      const projectData = await this.getObject(bucket, versionedKey);
      const project = JSON.parse(projectData.body);

      console.log(`✅ Project loaded successfully: ${projectName} version ${current.version}`);

      return {
        ...project,
        loadedAt: new Date().toISOString(),
        currentVersion: current.version
      };

    } catch (error) {
      console.error(`❌ Error loading project ${projectName}:`, error);
      throw error; // Re-throw to preserve error codes like NoSuchKey
    }
  }

  /**
   * List all projects for a user
   * @param {string} userId - User ID from JWT
   * @param {Object} options - Options (bucket, environment)
   * @returns {Promise<Array>} List of projects
   */
  async listProjects(userId, options = {}) {
    const { bucket = 'templatebuilder365-user-data', environment = 'dev' } = options;

    try {
      console.log(`📋 Listing projects for user: ${userId} in environment: ${environment}`);

      const prefix = `${environment}/${userId}/projects/`;

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: '/'
      });

      const result = await this.s3Client.send(command);
      const projects = [];

      // Process each project folder
      if (result.CommonPrefixes) {
        for (const prefixObj of result.CommonPrefixes) {
          const projectPath = prefixObj.Prefix;
          const projectName = projectPath.split('/').slice(-2, -1)[0]; // Extract project name from path

          try {
            // Try to get current.json for this project
            const currentKey = `${projectPath}current.json`;
            const currentData = await this.getObject(bucket, currentKey);
            const current = JSON.parse(currentData.body);

            projects.push({
              projectName,
              version: current.version,
              lastSaved: current.lastSaved,
              metadata: current.metadata,
              path: projectPath
            });

          } catch (error) {
            // If current.json doesn't exist, try to get project info from latest version
            console.warn(`No current.json for ${projectName}, checking versions...`);

            try {
              const versions = await this.listProjectVersions(bucket, projectPath);
              if (versions.length > 0) {
                const latestVersion = versions[versions.length - 1];
                const versionKey = `${projectPath}${latestVersion}/template.tb365`;
                const projectData = await this.getObject(bucket, versionKey);
                const project = JSON.parse(projectData.body);

                projects.push({
                  projectName,
                  version: latestVersion,
                  lastSaved: project.savedAt,
                  metadata: {
                    projectName: project.projectName,
                    lastModified: project.savedAt
                  },
                  path: projectPath,
                  note: 'Recovered from version history'
                });
              }
            } catch (versionError) {
              console.warn(`Could not recover project ${projectName}:`, versionError.message);
            }
          }
        }
      }

      console.log(`✅ Found ${projects.length} projects for user ${userId}`);

      return projects.sort((a, b) => new Date(b.lastSaved) - new Date(a.lastSaved));

    } catch (error) {
      console.error(`❌ Error listing projects for user ${userId}:`, error);
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }

  /**
   * Delete a project and all its versions
   * @param {string} userId - User ID from JWT
   * @param {string} projectName - Project name
   * @param {Object} options - Options (bucket, environment)
   * @returns {Promise<Object>} Delete result
   */
  async deleteProject(userId, projectName, options = {}) {
    const { bucket = 'templatebuilder365-user-data', environment = 'dev' } = options;

    try {
      console.log(`🗑️ Deleting project: ${projectName} for user: ${userId} in environment: ${environment}`);

      const projectPath = `${environment}/${userId}/projects/${projectName}`;

      // List all objects in the project path
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: projectPath + '/'
      });

      const result = await this.s3Client.send(command);

      if (!result.Contents || result.Contents.length === 0) {
        throw new Error(`Project ${projectName} not found`);
      }

      // Delete all objects in the project
      const deletePromises = result.Contents.map(object =>
        this.deleteObject(bucket, object.Key)
      );

      await Promise.all(deletePromises);

      console.log(`✅ Project deleted successfully: ${projectName} (${result.Contents.length} files)`);

      return {
        success: true,
        projectName,
        deletedFiles: result.Contents.length,
        deletedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error deleting project ${projectName}:`, error);
      throw error; // Re-throw to preserve error codes
    }
  }

  // === HELPER METHODS ===

  /**
   * Get current project version
   */
  async getCurrentProjectVersion(bucket, projectPath) {
    try {
      const currentKey = `${projectPath}/current.json`;
      const currentData = await this.getObject(bucket, currentKey);
      const current = JSON.parse(currentData.body);
      return current.version;
    } catch (error) {
      // If no current.json exists, check for existing versions
      const versions = await this.listProjectVersions(bucket, projectPath);
      return versions.length > 0 ? versions[versions.length - 1] : null;
    }
  }

  /**
   * Generate next version number
   */
  getNextVersion(currentVersion) {
    if (!currentVersion) {
      return 'v1';
    }

    const versionNumber = parseInt(currentVersion.replace('v', '')) || 0;
    return `v${versionNumber + 1}`;
  }

  /**
   * List project versions
   */
  async listProjectVersions(bucket, projectPath) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: projectPath + '/',
        Delimiter: '/'
      });

      const result = await this.s3Client.send(command);
      const versions = [];

      if (result.CommonPrefixes) {
        for (const prefixObj of result.CommonPrefixes) {
          const versionPath = prefixObj.Prefix;
          const version = versionPath.split('/').slice(-2, -1)[0];
          if (version.startsWith('v') && version !== 'current.json') {
            versions.push(version);
          }
        }
      }

      return versions.sort((a, b) => {
        const aNum = parseInt(a.replace('v', ''));
        const bNum = parseInt(b.replace('v', ''));
        return aNum - bNum;
      });

    } catch (error) {
      console.warn(`Could not list versions for ${projectPath}:`, error.message);
      return [];
    }
  }

  /**
   * Clean up old versions (keep last N versions)
   */
  async cleanupOldVersions(bucket, projectPath, keepCount = 3) {
    try {
      const versions = await this.listProjectVersions(bucket, projectPath);

      if (versions.length <= keepCount) {
        return; // Nothing to clean up
      }

      const versionsToDelete = versions.slice(0, versions.length - keepCount);
      console.log(`🧹 Cleaning up ${versionsToDelete.length} old versions for project`);

      for (const version of versionsToDelete) {
        const versionKey = `${projectPath}/${version}/template.tb365`;
        try {
          await this.deleteObject(bucket, versionKey);
          console.log(`🗑️ Deleted old version: ${version}`);
        } catch (error) {
          console.warn(`Could not delete version ${version}:`, error.message);
        }
      }

    } catch (error) {
      console.warn(`Error during version cleanup:`, error.message);
      // Don't throw - cleanup is not critical
    }
  }
}

// Create singleton instance
const s3Client = new S3ClientWrapper();

module.exports = {
  s3Client,
  S3ClientWrapper
};