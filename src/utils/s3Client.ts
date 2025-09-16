import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { CONFIG } from '../config/environment';
import type { CanvasState } from '../types';

interface ProjectFile {
  projectName: string;
  savedAt: string;
  version: string;
  canvasState: CanvasState;
}

interface ProjectVersion {
  version: string;
  lastSaved: string;
  restoredFrom?: string;
}

class S3ProjectClient {
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = CONFIG.S3_BUCKET;
  }

  private async getS3Client(): Promise<S3Client> {
    if (this.s3Client) {
      return this.s3Client;
    }

    // For now, we'll use environment credentials (AWS CLI or environment variables)
    // In production, this would use Cognito Identity Pool
    this.s3Client = new S3Client({
      region: CONFIG.AWS_REGION,
      // credentials will be automatically detected from environment
    });

    return this.s3Client;
  }

  private getProjectPath(userId: string, projectName: string): string {
    return `${CONFIG.ENVIRONMENT}/${userId}/projects/${projectName}`;
  }

  /**
   * Save project to S3 with versioning
   */
  async saveProject(userId: string, projectName: string, canvasState: CanvasState): Promise<string> {
    try {
      const s3 = await this.getS3Client();
      const projectPath = this.getProjectPath(userId, projectName);

      // Create new version number
      const timestamp = new Date().toISOString();
      const versionNumber = `v${Date.now()}`;

      // Project data
      const projectData: ProjectFile = {
        projectName,
        savedAt: timestamp,
        version: '1.0',
        canvasState
      };

      // Save the project file
      const projectKey = `${projectPath}/${versionNumber}/template.tb365`;
      await s3.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: projectKey,
        Body: JSON.stringify(projectData, null, 2),
        ContentType: 'application/json'
      }));

      // Update current.json pointer
      const currentData: ProjectVersion = {
        version: versionNumber,
        lastSaved: timestamp
      };

      const currentKey = `${projectPath}/current.json`;
      await s3.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: currentKey,
        Body: JSON.stringify(currentData, null, 2),
        ContentType: 'application/json'
      }));

      console.log(`✅ Project saved to S3: ${projectKey}`);
      return projectName;
    } catch (error) {
      console.error('❌ Failed to save project to S3:', error);
      throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load project from S3
   */
  async loadProject(userId: string, projectName: string): Promise<ProjectFile> {
    try {
      const s3 = await this.getS3Client();
      const projectPath = this.getProjectPath(userId, projectName);

      // Get current version pointer
      const currentKey = `${projectPath}/current.json`;
      const currentResponse = await s3.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: currentKey
      }));

      const currentData = JSON.parse(await currentResponse.Body!.transformToString()) as ProjectVersion;

      // Load the actual project file
      const projectKey = `${projectPath}/${currentData.version}/template.tb365`;
      const projectResponse = await s3.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: projectKey
      }));

      const projectData = JSON.parse(await projectResponse.Body!.transformToString()) as ProjectFile;

      console.log(`✅ Project loaded from S3: ${projectKey}`);
      return projectData;
    } catch (error) {
      console.error('❌ Failed to load project from S3:', error);
      throw new Error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List user's projects
   */
  async listProjects(userId: string): Promise<string[]> {
    try {
      const s3 = await this.getS3Client();
      const projectsPath = `${CONFIG.ENVIRONMENT}/${userId}/projects/`;

      const response = await s3.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: projectsPath,
        Delimiter: '/'
      }));

      const projects: string[] = [];
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const projectName = prefix.Prefix.replace(projectsPath, '').replace('/', '');
            if (projectName) {
              projects.push(projectName);
            }
          }
        }
      }

      console.log(`✅ Found ${projects.length} projects for user ${userId}`);
      return projects.sort();
    } catch (error) {
      console.error('❌ Failed to list projects from S3:', error);
      throw new Error(`Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(userId: string, projectName: string): Promise<void> {
    try {
      const s3 = await this.getS3Client();
      const projectPath = this.getProjectPath(userId, projectName);

      // List all objects in the project folder
      const listResponse = await s3.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `${projectPath}/`
      }));

      if (listResponse.Contents) {
        // Delete all objects
        for (const object of listResponse.Contents) {
          if (object.Key) {
            await s3.send(new DeleteObjectCommand({
              Bucket: this.bucketName,
              Key: object.Key
            }));
          }
        }
      }

      console.log(`✅ Project deleted from S3: ${projectPath}`);
    } catch (error) {
      console.error('❌ Failed to delete project from S3:', error);
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const s3Client = new S3ProjectClient();