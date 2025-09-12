const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
}

// Create singleton instance
const s3Client = new S3ClientWrapper();

module.exports = {
  s3Client,
  S3ClientWrapper
};