const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { convertTB365ToHTML } = require('./tb365-converter.cjs');

/**
 * Ultra-minimal TB365 to HTML converter
 * Focus: Fast, lightweight, HTML-only conversion
 */

// Validation schema
const conversionSchema = Joi.object({
  tb365Data: Joi.object({
    projectName: Joi.string().required(),
    version: Joi.string().required(),
    canvasState: Joi.object({
      elements: Joi.array().required(),
      canvasSize: Joi.object({
        width: Joi.number().required(),
        height: Joi.number().required()
      }).required()
    }).required()
  }).required(),
  data: Joi.object().optional(),
  options: Joi.object().optional()
});

/**
 * Main conversion handler
 */
exports.convertToHtml = async (event) => {
  const conversionId = uuidv4();

  try {
    console.log(`Starting conversion ${conversionId}`);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const { error, value } = conversionSchema.validate(body);

    if (error) {
      return errorResponse(400, 'Validation failed', error.details);
    }

    const { tb365Data, data = {}, options = {} } = value;

    // Use shared conversion library (single source of truth)
    const response = convertTB365ToHTML(tb365Data, data, options);

    console.log(`Conversion ${conversionId} completed successfully`);
    console.log(`Generated HTML: ${response.htmlResult.sizeKB}KB with ${response.originalProject.elements} elements`);

    // Override conversion ID with Lambda-generated one
    response.conversionId = conversionId;

    return successResponse(response);

  } catch (error) {
    console.error(`Conversion ${conversionId} failed:`, error.message);
    return errorResponse(500, 'Conversion failed', {
      conversionId,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Health check handler
 */
exports.health = async () => {
  return successResponse({
    status: 'healthy',
    service: 'tb365-html-converter',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};

// All conversion logic moved to shared library (tb365-converter.cjs)
// This eliminates code duplication and ensures consistency

/**
 * Success response helper
 */
function successResponse(data) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(data)
  };
}

/**
 * Error response helper
 */
function errorResponse(statusCode, message, details = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString()
    })
  };
}