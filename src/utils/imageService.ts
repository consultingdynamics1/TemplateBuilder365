import { isDevelopment, CONFIG } from '../config/environment';

export interface UploadImageResult {
  success: boolean;
  imageUrl: string;
  filename: string;
  existed?: boolean;
  error?: string;
}

export interface ImageInfo {
  filename: string;
  url: string;
  size?: number;
  lastModified?: string;
}

class ImageService {
  private getProjectName(): string {
    // Use a consistent fallback project name for image organization
    // This ensures each environment has its own pipeline without core type changes
    return 'current-project';
  }

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('tb365_token');

    const headers = {
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Upload an image file - environment aware with isolated pipelines
   * Dev: Creates blob URL immediately (no S3 dependency)
   * Stage/Prod: Uploads to S3 and returns S3 URL (complete cloud pipeline)
   */
  async uploadImage(file: File, projectName?: string): Promise<UploadImageResult> {
    const projectKey = projectName || this.getProjectName();
    if (isDevelopment()) {
      // Development mode: Use blob URLs (no S3 dependency)
      const imageUrl = URL.createObjectURL(file);
      return {
        success: true,
        imageUrl,
        filename: file.name,
        existed: false
      };
    }

    // Stage/Production mode: Upload to S3
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await this.makeAuthenticatedRequest(
        `${CONFIG.API_ENDPOINT}/api/projects/${projectKey}/images/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          imageUrl: result.imageUrl,
          filename: result.filename,
          existed: result.existed
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Image upload failed, falling back to blob URL:', error);

      // Fallback to blob URL if S3 upload fails
      const imageUrl = URL.createObjectURL(file);
      return {
        success: true,
        imageUrl,
        filename: file.name,
        existed: false,
        error: 'Cloud upload failed - using temporary URL'
      };
    }
  }

  /**
   * List project images
   * Dev: Returns empty array (blob URLs not persistent)
   * Stage/Prod: Returns S3 images
   */
  async listProjectImages(projectName?: string): Promise<ImageInfo[]> {
    const projectKey = projectName || this.getProjectName();
    if (isDevelopment()) {
      // Development mode: No persistent image storage
      return [];
    }

    // Stage/Production mode: List from S3
    try {
      const response = await this.makeAuthenticatedRequest(
        `${CONFIG.API_ENDPOINT}/api/projects/${projectKey}/images/list`
      );

      const result = await response.json();

      if (result.success) {
        return result.images || [];
      } else {
        console.error('Failed to list images:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error listing project images:', error);
      return [];
    }
  }

  /**
   * Delete project image
   * Dev: No-op (blob URLs are temporary)
   * Stage/Prod: Delete from S3
   */
  async deleteImage(imageName: string, projectName?: string): Promise<boolean> {
    const projectKey = projectName || this.getProjectName();
    if (isDevelopment()) {
      // Development mode: No persistent images to delete
      return true;
    }

    // Stage/Production mode: Delete from S3
    try {
      const response = await this.makeAuthenticatedRequest(
        `${CONFIG.API_ENDPOINT}/api/projects/${projectKey}/images/${imageName}`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Revoke blob URL (cleanup) - works in all environments
   */
  revokeImageUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Check if an image URL is a blob URL (temporary)
   */
  isBlobUrl(url: string): boolean {
    return url.startsWith('blob:');
  }

  /**
   * Check if an image URL is an S3 URL (persistent)
   */
  isS3Url(url: string): boolean {
    return url.includes('s3.') && url.includes('amazonaws.com');
  }
}

export const imageService = new ImageService();