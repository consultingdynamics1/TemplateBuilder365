const fs = require('fs');
const path = require('path');
const { s3Client } = require('../utils/s3-client');

/**
 * Output Manager Service
 * Handles flexible output options for converted TB365 data
 */

class OutputManager {
  constructor() {
    this.outputMode = process.env.OUTPUT_MODE || 'response-only';
    this.devBucket = process.env.DEV_BUCKET || 'your-integration-api-dev';
    this.prodBucket = process.env.API_TEMPLATE_BUCKET || 'apitemplate-exports-prod';
    this.localOutputDir = process.env.LOCAL_OUTPUT_DIR || '/tmp/test-output';
  }

  /**
   * Save converted data based on configured output mode
   * @param {string} conversionId - Unique conversion ID
   * @param {Object} htmlResult - Generated HTML result with data and metadata
   * @param {Object} parsedData - Original parsed TB365 data
   * @returns {Promise<Object>} Output result with paths/URLs
   */
  async saveConvertedData(conversionId, htmlResult, parsedData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log(`Saving converted data with mode: ${this.outputMode}`);
    
    switch (this.outputMode) {
      case 'local':
        return await this.saveToLocal(conversionId, htmlResult, parsedData, timestamp);
        
      case 's3-dev':
        return await this.saveToS3Dev(conversionId, htmlResult, parsedData, timestamp);
        
      case 's3-prod':
        return await this.saveToS3Prod(conversionId, htmlResult, parsedData, timestamp);
        
      case 'response-only':
        return this.prepareResponseOnly(conversionId, htmlResult, parsedData);
        
      default:
        throw new Error(`Unsupported output mode: ${this.outputMode}`);
    }
  }

  /**
   * Save to local file system for testing
   */
  async saveToLocal(conversionId, apiTemplateProject, parsedData, timestamp) {
    const timestampFolder = timestamp.replace(/[:.]/g, '-');
    const outputDir = path.join(this.localOutputDir, timestampFolder);
    
    try {
      // Ensure directory exists
      await this.ensureDirectoryExists(outputDir);
      
      // Prepare file data
      const files = this.prepareFileData(htmlResult, parsedData);
      
      // Save files
      const savedFiles = {};
      for (const [filename, data] of Object.entries(files)) {
        const filepath = path.join(outputDir, filename);
        
        // Handle different file types
        if (filename.endsWith('.html')) {
          // Write HTML as plain text
          await fs.promises.writeFile(filepath, data, 'utf8');
        } else {
          // Write JSON with formatting
          await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
        }
        
        const fileKey = filename.replace(/\.(html|json)$/, '');
        savedFiles[fileKey] = filepath;
        console.log(`✅ Saved ${filename} to ${filepath}`);
      }
      
      return {
        outputMode: 'local',
        conversionId,
        timestamp,
        localPaths: savedFiles,
        outputDirectory: outputDir,
        fileCount: Object.keys(files).length
      };
    } catch (error) {
      console.error('Error saving to local filesystem:', error);
      throw new Error(`Local save failed: ${error.message}`);
    }
  }

  /**
   * Save to development S3 bucket
   */
  async saveToS3Dev(conversionId, htmlResult, parsedData, timestamp) {
    const basePath = `test-runs/${timestamp}`;
    
    try {
      const files = this.prepareFileData(htmlResult, parsedData);
      const s3Results = {};
      
      for (const [filename, data] of Object.entries(files)) {
        const s3Key = `${basePath}/${filename}`;
        
        let content, contentType;
        if (filename.endsWith('.html')) {
          content = data;
          contentType = 'text/html';
        } else {
          content = JSON.stringify(data, null, 2);
          contentType = 'application/json';
        }
        
        const result = await s3Client.uploadObject(
          this.devBucket,
          s3Key,
          content,
          contentType
        );
        
        s3Results[filename.replace(/\.(html|json)$/, '')] = {
          s3Path: s3Key,
          downloadUrl: result.downloadUrl
        };
        console.log(`✅ Uploaded ${filename} to s3://${this.devBucket}/${s3Key}`);
      }
      
      return {
        outputMode: 's3-dev',
        conversionId,
        timestamp,
        bucket: this.devBucket,
        basePath,
        s3Results,
        fileCount: Object.keys(files).length
      };
    } catch (error) {
      console.error('Error saving to S3 dev bucket:', error);
      throw new Error(`S3 dev save failed: ${error.message}`);
    }
  }

  /**
   * Save to production S3 bucket (original behavior)
   */
  async saveToS3Prod(conversionId, htmlResult, parsedData, timestamp) {
    try {
      // Use new HTML format for S3 production
      const s3Paths = {
        html: `conversions/${conversionId}/template.html`,
        htmlVersioned: `conversions/${conversionId}/versions/template-${timestamp}.html`,
        data: `conversions/${conversionId}/data.json`,
        dataVersioned: `conversions/${conversionId}/versions/data-${timestamp}.json`
      };

      const files = this.prepareFileData(htmlResult, parsedData);

      const uploadPromises = [
        s3Client.uploadObject(this.prodBucket, s3Paths.html, files['template.html'], 'text/html'),
        s3Client.uploadObject(this.prodBucket, s3Paths.htmlVersioned, files['template.html'], 'text/html'),
        s3Client.uploadObject(this.prodBucket, s3Paths.data, JSON.stringify(files['data.json'], null, 2), 'application/json'),
        s3Client.uploadObject(this.prodBucket, s3Paths.dataVersioned, JSON.stringify(files['data.json'], null, 2), 'application/json')
      ];

      const [htmlResult, htmlVersionedResult, dataResult, dataVersionedResult] = await Promise.all(uploadPromises);

      console.log(`✅ Saved to production S3: ${Object.keys(s3Paths).length} files`);

      return {
        outputMode: 's3-prod',
        conversionId,
        timestamp,
        bucket: this.prodBucket,
        s3Paths,
        downloadUrls: {
          html: htmlResult.downloadUrl,
          htmlVersioned: htmlVersionedResult.downloadUrl,
          data: dataResult.downloadUrl,
          dataVersioned: dataVersionedResult.downloadUrl
        },
        fileCount: 4
      };
    } catch (error) {
      console.error('Error saving to S3 prod bucket:', error);
      throw new Error(`S3 prod save failed: ${error.message}`);
    }
  }

  /**
   * Return data in response only (no saving)
   */
  prepareResponseOnly(conversionId, htmlResult, parsedData) {
    console.log('✅ Prepared response-only data (no files saved)');
    
    const files = this.prepareFileData(htmlResult, parsedData);
    
    return {
      outputMode: 'response-only',
      conversionId,
      timestamp: new Date().toISOString(),
      convertedData: files,
      fileCount: Object.keys(files).length,
      dataSize: {
        html: files['template.html'].length,
        data: JSON.stringify(files['data.json']).length
      },
      htmlResult: htmlResult // Include complete result for direct access
    };
  }

  /**
   * Prepare standardized file data structure for new HTML format
   */
  prepareFileData(htmlResult, parsedData) {
    return {
      'template.html': htmlResult.html,
      'data.json': {
        ...htmlResult.data,
        metadata: htmlResult.metadata,
        generatedBy: 'tb365-converter-api',
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Ensure directory exists (create if needed)
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.promises.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.promises.mkdir(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get current output configuration
   */
  getOutputConfig() {
    return {
      outputMode: this.outputMode,
      devBucket: this.devBucket,
      prodBucket: this.prodBucket,
      localOutputDir: this.localOutputDir,
      availableModes: ['local', 's3-dev', 's3-prod', 'response-only']
    };
  }

  /**
   * Set output mode dynamically (useful for testing)
   */
  setOutputMode(mode) {
    const validModes = ['local', 's3-dev', 's3-prod', 'response-only'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid output mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
    }
    
    this.outputMode = mode;
    console.log(`🔄 Output mode changed to: ${mode}`);
    return this.getOutputConfig();
  }
}

// Create singleton instance
const outputManager = new OutputManager();

module.exports = {
  outputManager,
  OutputManager
};