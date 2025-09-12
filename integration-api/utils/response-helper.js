/**
 * Response helper utilities for consistent API responses
 */

/**
 * Create a successful response
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Lambda response object
 */
function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key'
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Create an error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} details - Optional error details
 * @returns {Object} Lambda response object
 */
function errorResponse(statusCode, message, details = null) {
  const errorData = {
    success: false,
    error: {
      message,
      code: statusCode,
      timestamp: new Date().toISOString()
    }
  };
  
  if (details) {
    errorData.error.details = details;
  }
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key'
    },
    body: JSON.stringify(errorData)
  };
}

/**
 * Create a validation error response
 * @param {Array} errors - Validation error details
 * @returns {Object} Lambda response object
 */
function validationErrorResponse(errors) {
  return errorResponse(400, 'Validation failed', errors);
}

/**
 * Create a not found response
 * @param {string} resource - Resource that was not found
 * @returns {Object} Lambda response object
 */
function notFoundResponse(resource = 'Resource') {
  return errorResponse(404, `${resource} not found`);
}

/**
 * Create an unauthorized response
 * @param {string} message - Optional custom message
 * @returns {Object} Lambda response object
 */
function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(401, message);
}

/**
 * Create a server error response
 * @param {string} message - Optional custom message
 * @param {*} details - Optional error details
 * @returns {Object} Lambda response object
 */
function serverErrorResponse(message = 'Internal server error', details = null) {
  return errorResponse(500, message, details);
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse
};