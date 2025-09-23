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

interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

class ImageService {
  // Image size limits for MVP
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_DIMENSION = 4096; // 4096px
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Validate image file before processing
   * Prevents crashes from oversized images in MVP
   */
  private validateImageFile(file: File): ImageValidationResult {
    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a JPG, PNG, or WebP image file.'
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      const sizeMB = (this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Image file is too large. Maximum size is ${sizeMB}MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Validate image dimensions (async - requires loading image)
   */
  private async validateImageDimensions(file: File): Promise<ImageValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (img.width > this.MAX_DIMENSION || img.height > this.MAX_DIMENSION) {
          resolve({
            valid: false,
            error: `Image dimensions too large. Maximum size is ${this.MAX_DIMENSION}×${this.MAX_DIMENSION} pixels.`
          });
        } else {
          resolve({ valid: true });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: false,
          error: 'Unable to load image. Please try a different file.'
        });
      };

      img.src = url;
    });
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
   * Upload an image file for project use
   * Dev: Convert to Base64 data URL for embedded storage
   * Stage/Prod: Upload directly to S3 project folder
   */
  async uploadImageToProject(file: File, projectName: string): Promise<UploadImageResult> {
    if (isDevelopment()) {
      // Development mode: Convert to Base64 for portable templates
      const base64Url = await this.convertFileToBase64(file);
      return {
        success: true,
        imageUrl: base64Url,
        filename: file.name,
        existed: false
      };
    }

    // Stage/Production mode: Upload to S3 project folder
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await this.makeAuthenticatedRequest(
        `${CONFIG.API_ENDPOINT}/api/projects/${projectName}/images/upload`,
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
      console.error('Image upload failed:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Create a blob URL for immediate use with validation
   * Dev: Create blob URL (will be converted to Base64 on add)
   * Stage/Prod: Create blob URL until save
   * Throws error if file is invalid to prevent crashes
   */
  createBlobUrl(file: File): string {
    // Validate basic file properties (type, size)
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return URL.createObjectURL(file);
  }

  /**
   * Create image URL for development mode (Base64) or stage/prod (blob URL)
   * This ensures consistent behavior across environments
   */
  async createImageUrlForEnvironment(file: File): Promise<string> {
    // Validate basic file properties (type, size)
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (isDevelopment()) {
      // Development: Convert to Base64 immediately for portable storage
      return await this.convertFileToBase64(file);
    } else {
      // Stage/Production: Use blob URL until save
      return URL.createObjectURL(file);
    }
  }

  /**
   * Create a blob URL with full validation including dimensions
   * Use this for user-facing uploads that need complete validation
   */
  async createValidatedBlobUrl(file: File): Promise<string> {
    // Validate basic file properties first
    const basicValidation = this.validateImageFile(file);
    if (!basicValidation.valid) {
      throw new Error(basicValidation.error);
    }

    // Validate dimensions
    const dimensionValidation = await this.validateImageDimensions(file);
    if (!dimensionValidation.valid) {
      throw new Error(dimensionValidation.error);
    }

    return URL.createObjectURL(file);
  }

  /**
   * Convert blob URL back to File for uploading
   * Used during save to get File object from blob URL
   */
  async blobToFile(blobUrl: string, filename: string): Promise<File> {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  }

  /**
   * List project images
   * Dev: Returns empty array (blob URLs not persistent)
   * Stage/Prod: Returns S3 images
   */
  async listProjectImages(projectName: string): Promise<ImageInfo[]> {
    if (isDevelopment()) {
      // Development mode: No persistent image storage
      return [];
    }

    // Stage/Production mode: List from S3
    try {
      const response = await this.makeAuthenticatedRequest(
        `${CONFIG.API_ENDPOINT}/api/projects/${projectName}/images/list`
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
  async deleteImage(imageName: string, projectName: string): Promise<boolean> {
    if (isDevelopment()) {
      // Development mode: No persistent images to delete
      return true;
    }

    // Stage/Production mode: Delete from S3
    try {
      const response = await this.makeAuthenticatedRequest(
        `${CONFIG.API_ENDPOINT}/api/projects/${projectName}/images/${imageName}`,
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

  /**
   * Check if an image URL is a Base64 data URL (embedded)
   */
  isBase64Url(url: string): boolean {
    return url.startsWith('data:image/');
  }

  /**
   * Convert file to Base64 data URL for development mode
   * Creates portable images that can be embedded in templates
   */
  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64String = reader.result as string;
        console.log(`📷 Converted ${file.name} to Base64 (${Math.round(base64String.length / 1024)}KB)`);
        resolve(base64String);
      };

      reader.onerror = () => {
        console.error(`❌ Failed to convert ${file.name} to Base64`);
        reject(new Error('Failed to convert image to Base64'));
      };

      reader.readAsDataURL(file);
    });
  }
}

export const imageService = new ImageService();