const { tb365Parser } = require('../services/tb365-parser');
const { htmlGenerator } = require('../services/html-generator');
const { outputManager } = require('../services/output-manager');\nconst { variableReplacer } = require('../services/variable-replacer');
const { s3Client } = require('../utils/s3-client');
const { validateInput } = require('../utils/validation');
const { successResponse, errorResponse, unauthorizedResponse } = require('../utils/response-helper');
const { v4: uuidv4 } = require('uuid');

/**
 * Main Lambda handler for converting TB365 format to APITemplate.io format
 */
exports.handler = async (event) => {
  try {
    console.log('Received event:', {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: Object.keys(event.headers || {}),
      bodySize: event.body ? event.body.length : 0
    });

    // Extract request data
    const { httpMethod, pathParameters, body, headers = {} } = event;
    
    // API Key Authentication
    const authResult = authenticateRequest(headers);
    if (!authResult.success) {
      console.warn('Authentication failed:', authResult.reason);
      return unauthorizedResponse(authResult.message);
    }
    
    // Route handling
    if (httpMethod === 'POST' && event.path === '/convert') {
      return await handleConversion(body, headers);
    } else if (httpMethod === 'GET' && event.path === '/output-config') {
      return await handleGetOutputConfig();
    } else if (httpMethod === 'POST' && event.path === '/output-config') {
      return await handleSetOutputConfig(body, headers);
    } else if (httpMethod === 'GET' && pathParameters?.id) {
      return await handleGetConversion(pathParameters.id);
    } else if (httpMethod === 'OPTIONS') {
      return handleOptionsRequest();
    }
    
    return errorResponse(400, 'Invalid request method or missing parameters');
  } catch (error) {
    console.error('Unhandled conversion error:', error);
    return errorResponse(500, 'Internal server error', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Authenticate API request using x-api-key header
 * @param {Object} headers - Request headers
 * @returns {Object} Authentication result
 */
function authenticateRequest(headers) {
  const apiKey = process.env.API_KEY;
  
  // Skip authentication in development if no API key is set
  if (!apiKey && process.env.NODE_ENV === 'development') {
    console.warn('No API key configured - skipping authentication in development');
    return { success: true };
  }
  
  if (!apiKey) {
    return {
      success: false,
      reason: 'No API key configured',
      message: 'API authentication not configured'
    };
  }
  
  // Check for API key in headers (case-insensitive)
  const providedKey = headers['x-api-key'] || headers['X-API-Key'] || headers['X-Api-Key'];
  
  if (!providedKey) {
    return {
      success: false,
      reason: 'Missing API key header',
      message: 'Missing x-api-key header'
    };
  }
  
  if (providedKey !== apiKey) {
    return {
      success: false,
      reason: 'Invalid API key',
      message: 'Invalid API key'
    };
  }
  
  return { success: true };
}

/**
 * Handle OPTIONS request for CORS preflight
 */
function handleOptionsRequest() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, Authorization',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
}

/**
 * Health check handler
 */
exports.health = async () => {
  try {
    return successResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'tb365-converter-api',
      version: '1.0.0'
    });
  } catch (error) {
    return errorResponse(500, 'Service unhealthy', error.message);
  }
};

/**
 * Handle POST /convert - Convert TB365 to APITemplate format
 * @param {string} body - Request body
 * @param {Object} headers - Request headers
 */
async function handleConversion(body, headers = {}) {
  const conversionId = uuidv4();
  
  try {
    // Basic request validation
    if (!body || body.trim().length === 0) {
      return errorResponse(400, 'Request body is required');
    }

    // Parse JSON body
    let input;
    try {
      input = JSON.parse(body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      return errorResponse(400, 'Invalid JSON format', {
        error: parseError.message,
        receivedLength: body.length
      });
    }

    // Validate TB365 format structure
    const basicValidation = validateTB365Format(input);
    if (!basicValidation.valid) {
      return errorResponse(400, 'Invalid TB365 format', basicValidation.errors);
    }

    // Detailed input validation
    const validationResult = validateInput(input);
    if (validationResult.error) {
      console.error('Validation failed:', validationResult.error.details);
      return errorResponse(400, 'Input validation failed', validationResult.error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      })));
    }
    
    const { tb365Data, options = {} } = validationResult.value;
    
    console.log(`Starting conversion ${conversionId}:`, {
      projectName: tb365Data.projectName,
      version: tb365Data.version,
      elements: tb365Data.canvasState?.elements?.length || 0,
      canvasSize: tb365Data.canvasState?.canvasSize,
      options
    });
    
    // Step 1: Parse TB365 format
    const parsedData = await tb365Parser.parse(tb365Data);
    console.log(`Parsed TB365 data: ${parsedData.elements.length} elements, ${parsedData.textContent.variables.length} variables`);
    
    // Step 2: Generate complete HTML document
    const htmlResult = await htmlGenerator.generate(parsedData, options);
    console.log(`Generated complete HTML document (${Math.round(htmlResult.html.length / 1024)}KB) with ${htmlResult.metadata.variables} variables`);
    
    // Step 3: Save converted data using configured output mode
    const outputResult = await outputManager.saveConvertedData(conversionId, htmlResult, parsedData);
    
    console.log(`Conversion ${conversionId} completed successfully`);
    
    return successResponse({
      conversionId,
      status: 'completed',
      outputMode: outputResult.outputMode,
      originalProject: {
        name: tb365Data.projectName,
        version: tb365Data.version,
        elements: parsedData.elements.length,
        canvasSize: parsedData.canvas.size,
        variables: parsedData.textContent.variables.length
      },
      generatedHtml: {
        size: htmlResult.html.length,
        sizeKB: Math.round(htmlResult.html.length / 1024),
        variables: htmlResult.metadata.variables,
        complexity: htmlResult.metadata.complexity,
        generationTime: htmlResult.metadata.generationTime
      },
      htmlResult: outputResult.htmlResult || htmlResult, // Include HTML result for direct access
      output: outputResult,
      conversionOptions: options,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Conversion ${conversionId} failed:`, {
      error: error.message,
      stack: error.stack,
      stage: error.stage || 'unknown'
    });
    
    // Return appropriate error based on error type
    if (error.name === 'ValidationError') {
      return errorResponse(400, 'Data validation failed', error.message);
    } else if (error.name === 'S3Error') {
      return errorResponse(502, 'Storage service error', 'Failed to store conversion results');
    } else if (error.message.includes('TB365 parsing failed')) {
      return errorResponse(422, 'TB365 format error', error.message);
    } else if (error.message.includes('Project generation failed')) {
      return errorResponse(500, 'Template generation error', error.message);
    }
    
    return errorResponse(500, 'Conversion failed', {
      conversionId,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Basic TB365 format validation
 * @param {Object} input - Input to validate
 * @returns {Object} Validation result
 */
function validateTB365Format(input) {
  const errors = [];
  
  if (!input || typeof input !== 'object') {
    errors.push('Input must be a valid object');
    return { valid: false, errors };
  }
  
  // Check for tb365Data
  if (!input.tb365Data) {
    errors.push('Missing tb365Data property');
  } else {
    const tb365Data = input.tb365Data;
    
    // Check required properties
    if (!tb365Data.projectName) {
      errors.push('Missing tb365Data.projectName');
    }
    if (!tb365Data.version) {
      errors.push('Missing tb365Data.version');
    }
    if (!tb365Data.canvasState) {
      errors.push('Missing tb365Data.canvasState');
    } else {
      // Check canvasState structure
      if (!Array.isArray(tb365Data.canvasState.elements)) {
        errors.push('canvasState.elements must be an array');
      }
      if (!tb365Data.canvasState.canvasSize || 
          typeof tb365Data.canvasState.canvasSize.width !== 'number' ||
          typeof tb365Data.canvasState.canvasSize.height !== 'number') {
        errors.push('canvasState.canvasSize must have numeric width and height');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Handle GET /convert/{id} - Get conversion status/results
 */
async function handleGetConversion(conversionId) {
  try {
    const s3Paths = {
      main: `conversions/${conversionId}/apitemplate-project.json`,
      metadata: `conversions/${conversionId}/metadata.json`
    };
    
    // Check if conversion exists
    const exists = await s3Client.objectExists(process.env.API_TEMPLATE_BUCKET, s3Paths.main);
    
    if (!exists) {
      return errorResponse(404, 'Conversion not found');
    }
    
    // Generate new presigned URLs
    const downloadUrls = {
      main: await s3Client.generatePresignedUrl(
        process.env.API_TEMPLATE_BUCKET,
        s3Paths.main,
        3600 // 1 hour expiry
      ),
      metadata: await s3Client.generatePresignedUrl(
        process.env.API_TEMPLATE_BUCKET,
        s3Paths.metadata,
        3600
      )
    };
    
    // Get object metadata
    const metadata = await s3Client.getObjectMetadata(process.env.API_TEMPLATE_BUCKET, s3Paths.main);
    
    // Try to get conversion metadata if available
    let conversionMetadata = null;
    try {
      const metadataExists = await s3Client.objectExists(process.env.API_TEMPLATE_BUCKET, s3Paths.metadata);
      if (metadataExists) {
        const metadataObj = await s3Client.getObject(process.env.API_TEMPLATE_BUCKET, s3Paths.metadata);
        conversionMetadata = JSON.parse(metadataObj.body);
      }
    } catch (metadataError) {
      console.warn('Could not retrieve conversion metadata:', metadataError.message);
    }
    
    return successResponse({
      conversionId,
      status: 'completed',
      downloadUrls,
      s3Paths,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: metadata.LastModified,
      size: metadata.ContentLength,
      contentType: metadata.ContentType,
      conversionMetadata
    });
    
  } catch (error) {
    console.error('Get conversion error:', error);
    return errorResponse(500, 'Failed to retrieve conversion', error.message);
  }
}

/**
 * Handle GET /output-config - Get current output configuration
 */
async function handleGetOutputConfig() {
  try {
    const config = outputManager.getOutputConfig();
    
    return successResponse({
      outputConfiguration: config,
      description: 'Current output mode configuration for TB365 converter',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get output config error:', error);
    return errorResponse(500, 'Failed to get output configuration', error.message);
  }
}

/**
 * Handle POST /output-config - Set output configuration
 */
async function handleSetOutputConfig(body, headers) {
  try {
    if (!body) {
      return errorResponse(400, 'Request body is required');
    }

    const requestData = JSON.parse(body);
    const { outputMode } = requestData;

    if (!outputMode) {
      return errorResponse(400, 'outputMode is required in request body');
    }

    const newConfig = outputManager.setOutputMode(outputMode);
    
    return successResponse({
      message: `Output mode updated to: ${outputMode}`,
      previousMode: process.env.OUTPUT_MODE || 'response-only',
      newConfiguration: newConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Set output config error:', error);
    return errorResponse(400, error.message);
  }
}