/**
 * Local Puppeteer Renderer Service
 * Stage 1: Local Development Version for PDF and PNG generation
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class LocalRenderer {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
  }

  /**
   * Initialize browser instance
   * @param {Object} options - Browser launch options
   */
  async initialize(options = {}) {
    if (this.isInitialized && this.browser) {
      return;
    }

    try {
      console.log('Launching Puppeteer browser...');
      
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        ...options
      };

      this.browser = await puppeteer.launch(launchOptions);
      this.isInitialized = true;
      
      console.log('✅ Puppeteer browser launched successfully');
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw new Error(`Browser initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF from HTML content
   * @param {string} htmlContent - HTML string to render
   * @param {Object} options - PDF generation options
   * @returns {Object} Result with buffer and metadata
   */
  async generatePDF(htmlContent, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    let page = null;

    try {
      console.log('Creating new page for PDF generation...');
      page = await this.browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: options.width || 1200,
        height: options.height || 800,
        deviceScaleFactor: options.deviceScaleFactor || 2
      });

      // Set content and wait for load
      await page.setContent(htmlContent, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
        timeout: options.timeout || 30000
      });

      // Wait a bit more for fonts and assets
      await new Promise(resolve => setTimeout(resolve, options.waitTime || 1000));

      console.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        preferCSSPageSize: options.preferCSSPageSize || false,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
        ...options.pdfOptions
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ PDF generated successfully in ${processingTime}ms (${Math.round(pdfBuffer.length / 1024)}KB)`);

      return {
        success: true,
        buffer: pdfBuffer,
        metadata: {
          format: options.format || 'A4',
          size: pdfBuffer.length,
          sizeKB: Math.round(pdfBuffer.length / 1024),
          processingTime: processingTime + 'ms',
          contentLength: htmlContent.length,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('PDF generation failed:', error);
      return {
        success: false,
        error: {
          message: error.message,
          type: 'PDF_GENERATION_ERROR',
          processingTime: Date.now() - startTime + 'ms'
        }
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generate PNG screenshot from HTML content
   * @param {string} htmlContent - HTML string to render
   * @param {Object} options - Screenshot options
   * @returns {Object} Result with buffer and metadata
   */
  async generatePNG(htmlContent, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    let page = null;

    try {
      console.log('Creating new page for PNG generation...');
      page = await this.browser.newPage();

      // Set viewport
      const viewport = {
        width: options.width || 1200,
        height: options.height || 800,
        deviceScaleFactor: options.deviceScaleFactor || 2
      };
      
      await page.setViewport(viewport);

      // Set content and wait for load
      await page.setContent(htmlContent, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
        timeout: options.timeout || 30000
      });

      // Wait for fonts and assets
      await new Promise(resolve => setTimeout(resolve, options.waitTime || 1000));

      console.log('Taking screenshot...');
      
      // Determine screenshot area
      let screenshotOptions = {
        type: 'png',
        omitBackground: options.omitBackground || false,
        ...options.screenshotOptions
      };

      if (options.fullPage) {
        screenshotOptions.fullPage = true;
      } else if (options.clip) {
        screenshotOptions.clip = options.clip;
      }

      const pngBuffer = await page.screenshot(screenshotOptions);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ PNG generated successfully in ${processingTime}ms (${Math.round(pngBuffer.length / 1024)}KB)`);

      return {
        success: true,
        buffer: pngBuffer,
        metadata: {
          dimensions: `${viewport.width}x${viewport.height}`,
          size: pngBuffer.length,
          sizeKB: Math.round(pngBuffer.length / 1024),
          processingTime: processingTime + 'ms',
          contentLength: htmlContent.length,
          fullPage: options.fullPage || false,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('PNG generation failed:', error);
      return {
        success: false,
        error: {
          message: error.message,
          type: 'PNG_GENERATION_ERROR',
          processingTime: Date.now() - startTime + 'ms'
        }
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generate both PDF and PNG from HTML content
   * @param {string} htmlContent - HTML string to render
   * @param {Object} options - Generation options
   * @returns {Object} Result with both buffers and metadata
   */
  async generateBoth(htmlContent, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('Generating both PDF and PNG...');
      
      // Generate PDF and PNG in parallel for better performance
      const [pdfResult, pngResult] = await Promise.all([
        this.generatePDF(htmlContent, options.pdf || {}),
        this.generatePNG(htmlContent, options.png || {})
      ]);

      const totalTime = Date.now() - startTime;

      return {
        success: pdfResult.success && pngResult.success,
        pdf: pdfResult,
        png: pngResult,
        metadata: {
          totalProcessingTime: totalTime + 'ms',
          contentLength: htmlContent.length,
          timestamp: new Date().toISOString()
        },
        errors: [
          ...(pdfResult.success ? [] : [pdfResult.error]),
          ...(pngResult.success ? [] : [pngResult.error])
        ]
      };

    } catch (error) {
      console.error('Combined generation failed:', error);
      return {
        success: false,
        error: {
          message: error.message,
          type: 'COMBINED_GENERATION_ERROR',
          processingTime: Date.now() - startTime + 'ms'
        }
      };
    }
  }

  /**
   * Save buffer to file
   * @param {Buffer} buffer - File buffer
   * @param {string} filepath - Output file path
   * @returns {Object} Save result
   */
  async saveToFile(buffer, filepath) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filepath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(filepath, buffer);
      
      const stats = await fs.stat(filepath);
      
      console.log(`✅ File saved: ${filepath} (${Math.round(stats.size / 1024)}KB)`);
      
      return {
        success: true,
        filepath,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024)
      };
      
    } catch (error) {
      console.error('Failed to save file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get browser performance metrics
   * @returns {Object} Performance metrics
   */
  async getMetrics() {
    if (!this.browser) {
      return { available: false };
    }

    try {
      const pages = await this.browser.pages();
      return {
        available: true,
        isConnected: this.browser.isConnected(),
        pagesOpen: pages.length,
        processId: this.browser.process()?.pid || 'unknown',
        version: await this.browser.version(),
        userAgent: await this.browser.userAgent()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    if (this.browser) {
      try {
        console.log('Closing Puppeteer browser...');
        await this.browser.close();
        this.browser = null;
        this.isInitialized = false;
        console.log('✅ Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }

  /**
   * Health check for renderer service
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Test with simple HTML
      const testHtml = '<html><body><h1>Health Check</h1></body></html>';
      const startTime = Date.now();
      
      const result = await this.generatePNG(testHtml, { 
        width: 400, 
        height: 300,
        waitTime: 100
      });
      
      const healthTime = Date.now() - startTime;

      return {
        healthy: result.success,
        responseTime: healthTime + 'ms',
        browserMetrics: await this.getMetrics(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const localRenderer = new LocalRenderer();

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up...');
  await localRenderer.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, cleaning up...');
  await localRenderer.cleanup();
  process.exit(0);
});

module.exports = {
  localRenderer,
  LocalRenderer
};