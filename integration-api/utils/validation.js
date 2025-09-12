const Joi = require('joi');

/**
 * Validation schemas and utilities
 */

// TB365 Element schemas
const positionSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required()
});

const sizeSchema = Joi.object({
  width: Joi.number().min(1).required(),
  height: Joi.number().min(1).required()
});

const baseElementSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('text', 'rectangle', 'image', 'table').required(),
  position: positionSchema.required(),
  size: sizeSchema.required(),
  visible: Joi.boolean().default(true),
  locked: Joi.boolean().default(false),
  name: Joi.string().required(),
  zIndex: Joi.number().required()
});

const textElementSchema = baseElementSchema.keys({
  type: Joi.string().valid('text').required(),
  content: Joi.string().required(),
  fontSize: Joi.number().min(1).required(),
  fontFamily: Joi.string().required(),
  fontWeight: Joi.string().valid('normal', 'bold').required(),
  fontStyle: Joi.string().valid('normal', 'italic').required(),
  textAlign: Joi.string().valid('left', 'center', 'right').required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  backgroundColor: Joi.alternatives().try(
    Joi.string().valid('transparent'),
    Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/)
  ).optional(),
  padding: Joi.number().min(0).required()
});

const rectangleElementSchema = baseElementSchema.keys({
  type: Joi.string().valid('rectangle').required(),
  fill: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  stroke: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  strokeWidth: Joi.number().min(0).required(),
  cornerRadius: Joi.number().min(0).required()
});

const imageElementSchema = baseElementSchema.keys({
  type: Joi.string().valid('image').required(),
  src: Joi.string().uri().allow('').required(),
  opacity: Joi.number().min(0).max(1).required(),
  fit: Joi.string().valid('fill', 'contain', 'cover', 'stretch').required()
});

const tableCellSchema = Joi.object({
  content: Joi.string().required(),
  isHeader: Joi.boolean().default(false)
});

const tableElementSchema = baseElementSchema.keys({
  type: Joi.string().valid('table').required(),
  rows: Joi.number().min(1).required(),
  columns: Joi.number().min(1).required(),
  cells: Joi.array().items(
    Joi.array().items(tableCellSchema)
  ).required(),
  cellPadding: Joi.number().min(0).required(),
  borderWidth: Joi.number().min(0).required(),
  borderColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  headerBackground: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  cellBackground: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  textColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  fontSize: Joi.number().min(1).required(),
  fontFamily: Joi.string().required()
});

const elementSchema = Joi.alternatives().try(
  textElementSchema,
  rectangleElementSchema,
  imageElementSchema,
  tableElementSchema
);

const canvasStateSchema = Joi.object({
  elements: Joi.array().items(elementSchema).required(),
  selectedElementId: Joi.string().allow(null),
  editingElementId: Joi.string().allow(null),
  activeTool: Joi.string().valid('select', 'text', 'rectangle', 'image', 'table').required(),
  canvasSize: sizeSchema.required(),
  zoom: Joi.number().min(0.1).max(2).required(),
  snapToGrid: Joi.boolean().required(),
  gridSize: Joi.number().min(1).required()
});

const tb365DataSchema = Joi.object({
  projectName: Joi.string().required(),
  savedAt: Joi.string().isoDate().required(),
  version: Joi.string().required(),
  canvasState: canvasStateSchema.required()
});

const conversionOptionsSchema = Joi.object({
  outputFormat: Joi.string().valid('json', 'html').default('json'),
  includeAssets: Joi.boolean().default(false),
  generatePreview: Joi.boolean().default(false),
  compression: Joi.string().valid('none', 'gzip').default('none'),
  customSettings: Joi.object().default({})
});

const inputSchema = Joi.object({
  tb365Data: tb365DataSchema.required(),
  options: conversionOptionsSchema.optional()
});

/**
 * Validate input data for conversion
 * @param {Object} input - Input data to validate
 * @returns {Object} Validation result
 */
function validateInput(input) {
  return inputSchema.validate(input, { 
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
}

/**
 * Validate TB365 canvas state
 * @param {Object} canvasState - Canvas state to validate
 * @returns {Object} Validation result
 */
function validateCanvasState(canvasState) {
  return canvasStateSchema.validate(canvasState, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
}

/**
 * Validate conversion options
 * @param {Object} options - Options to validate
 * @returns {Object} Validation result
 */
function validateOptions(options) {
  return conversionOptionsSchema.validate(options, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
}

/**
 * Format validation errors for API response
 * @param {Object} validationError - Joi validation error
 * @returns {Array} Formatted error details
 */
function formatValidationErrors(validationError) {
  return validationError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
}

module.exports = {
  validateInput,
  validateCanvasState,
  validateOptions,
  formatValidationErrors,
  schemas: {
    inputSchema,
    tb365DataSchema,
    canvasStateSchema,
    conversionOptionsSchema,
    elementSchema,
    textElementSchema,
    rectangleElementSchema,
    imageElementSchema,
    tableElementSchema
  }
};