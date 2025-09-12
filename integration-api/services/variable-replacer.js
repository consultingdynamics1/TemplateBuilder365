/**
 * Variable Replacer Service
 * Production-ready data binding and variable replacement in HTML templates
 * with comprehensive error handling, validation, and security features
 */

class VariableReplacer {
  /**
   * Replace variables in HTML template with actual data
   * @param {string} htmlTemplate - HTML template with {{variable}} placeholders
   * @param {Object} data - Data object with variable values
   * @param {Object} defaultValues - Default values for missing variables
   * @param {Object} options - Replacement options
   * @returns {Object} Result with replaced HTML and statistics
   */
  replaceVariables(htmlTemplate, data = {}, defaultValues = {}, options = {}) {
    const startTime = Date.now();
    const warnings = [];
    
    try {
      // Validate inputs
      const validation = this.validateInputs(htmlTemplate, data, defaultValues, options);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          warnings: validation.warnings || [],
          html: htmlTemplate
        };
      }
      warnings.push(...(validation.warnings || []));
      
      // Sanitize data to prevent HTML injection
      const sanitizedData = this.sanitizeData(data, options);
      if (sanitizedData._warnings) {
        warnings.push(...sanitizedData._warnings);
        delete sanitizedData._warnings;
      }
      
      // Normalize data for easier access
      const normalizedData = this.normalizeData(sanitizedData);
      
      // Find all variables in template
      const variableMatches = this.findVariables(htmlTemplate);
      
      console.log(`Found ${variableMatches.length} variable instances to replace`);
      
      // Replace variables
      let replacedHtml = htmlTemplate;
      const replacementLog = [];
      const missingVariables = [];
      
      variableMatches.forEach(match => {
        const { fullMatch, variableName, startIndex } = match;
        
        // Get replacement value with error handling
        let replacement;
        try {
          replacement = this.getReplacementValue(
            variableName, 
            normalizedData, 
            defaultValues, 
            options
          );
        } catch (replaceError) {
          warnings.push({
            type: 'REPLACEMENT_ERROR',
            variable: variableName,
            message: `Error processing variable: ${replaceError.message}`
          });
          replacement = { found: false };
        }
        
        if (replacement.found) {
          // Replace the variable
          replacedHtml = replacedHtml.replace(fullMatch, replacement.value);
          replacementLog.push({
            variable: variableName,
            original: fullMatch,
            replaced: replacement.value,
            source: replacement.source
          });
        } else {
          // Track missing variables
          missingVariables.push({
            variable: variableName,
            fullMatch,
            position: startIndex
          });
          
          // Replace with fallback or leave as is
          if (options.removeMissingVariables) {
            replacedHtml = replacedHtml.replace(fullMatch, '');
          } else if (options.missingVariableText) {
            replacedHtml = replacedHtml.replace(fullMatch, options.missingVariableText);
          }
          // Otherwise leave the variable as-is
        }
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        html: replacedHtml,
        statistics: {
          originalLength: htmlTemplate.length,
          replacedLength: replacedHtml.length,
          totalVariables: variableMatches.length,
          replacedVariables: replacementLog.length,
          missingVariables: missingVariables.length,
          processingTime: processingTime + 'ms',
          memoryUsed: process.memoryUsage().heapUsed,
          warningsCount: warnings.length
        },
        replacements: replacementLog,
        missing: missingVariables,
        warnings,
        processingTime
      };
      
    } catch (error) {
      console.error('Critical error in variable replacement:', {
        message: error.message,
        stack: error.stack,
        templateLength: htmlTemplate?.length,
        dataKeys: data ? Object.keys(data).length : 0
      });
      
      return {
        success: false,
        error: {
          message: error.message,
          type: error.name || 'UnknownError',
          code: 'VARIABLE_REPLACEMENT_ERROR'
        },
        warnings,
        html: htmlTemplate,
        statistics: {
          processingTime: Date.now() - startTime + 'ms',
          originalLength: htmlTemplate?.length || 0,
          replacedLength: 0,
          totalVariables: 0,
          replacedVariables: 0,
          missingVariables: 0
        }
      };
    } finally {
      // Memory cleanup
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Validate inputs before processing
   * @param {string} htmlTemplate - HTML template
   * @param {Object} data - Data object
   * @param {Object} defaultValues - Default values
   * @param {Object} options - Processing options
   * @returns {Object} Validation result
   */
  validateInputs(htmlTemplate, data, defaultValues, options) {
    const warnings = [];
    
    // Template validation
    if (typeof htmlTemplate !== 'string') {
      return { valid: false, error: 'HTML template must be a string' };
    }
    
    if (htmlTemplate.length === 0) {
      return { valid: false, error: 'HTML template cannot be empty' };
    }
    
    if (htmlTemplate.length > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, error: 'HTML template too large (max 10MB)' };
    }
    
    // Data validation
    if (data !== null && typeof data !== 'object') {
      return { valid: false, error: 'Data must be an object or null' };
    }
    
    if (defaultValues !== null && typeof defaultValues !== 'object') {
      return { valid: false, error: 'Default values must be an object or null' };
    }
    
    // Options validation
    if (options !== null && typeof options !== 'object') {
      return { valid: false, error: 'Options must be an object or null' };
    }
    
    // Check for excessive variable count
    const variableCount = (htmlTemplate.match(/\{\{[^}]+\}\}/g) || []).length;
    if (variableCount > 1000) {
      warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: `Template contains ${variableCount} variables, may impact performance`
      });
    }
    
    return { valid: true, warnings };
  }
  
  /**
   * Sanitize data to prevent HTML injection and validate formats
   * @param {Object} data - Raw data object
   * @param {Object} options - Sanitization options
   * @returns {Object} Sanitized data
   */
  sanitizeData(data, options = {}) {
    if (!data || typeof data !== 'object') return data;
    
    const warnings = [];
    
    const sanitizeValue = (value, key) => {
      if (value === null || value === undefined) return value;
      
      // Convert to string for processing
      let str = String(value);
      
      // Check for potentially malicious content
      if (str.includes('<script') || str.includes('javascript:') || str.includes('onload=')) {
        warnings.push({
          type: 'SECURITY_WARNING',
          key,
          message: 'Potential XSS content detected and sanitized'
        });
        // Aggressively sanitize suspicious content
        str = str.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '');
      }
      
      // Validate specific data types
      if (key && key.includes('phone')) {
        if (!this.isValidPhoneNumber(str)) {
          warnings.push({
            type: 'VALIDATION_WARNING',
            key,
            message: `Invalid phone number format: ${str}`
          });
        }
      }
      
      if (key && (key.includes('email'))) {
        if (!this.isValidEmail(str)) {
          warnings.push({
            type: 'VALIDATION_WARNING',
            key,
            message: `Invalid email format: ${str}`
          });
        }
      }
      
      if (key && (key.includes('url') || key.includes('website'))) {
        if (!this.isValidUrl(str)) {
          warnings.push({
            type: 'VALIDATION_WARNING',
            key,
            message: `Invalid URL format: ${str}`
          });
        }
      }
      
      return str;
    };
    
    const sanitizeObject = (obj) => {
      const result = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = sanitizeValue(value, key);
        }
      });
      return result;
    };
    
    const sanitized = sanitizeObject(data);
    // Attach warnings to the result (temporary storage)
    sanitized._warnings = warnings;
    return sanitized;
  }
  
  /**
   * Validate phone number format
   * @param {string} phone - Phone number
   * @returns {boolean} Is valid
   */
  isValidPhoneNumber(phone) {
    if (!phone) return true; // Allow empty
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }
  
  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} Is valid
   */
  isValidEmail(email) {
    if (!email) return true; // Allow empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate URL format
   * @param {string} url - URL
   * @returns {boolean} Is valid
   */
  isValidUrl(url) {
    if (!url) return true; // Allow empty
    try {
      new URL(url.includes('://') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find all variable instances in HTML template
   * @param {string} html - HTML template
   * @returns {Array} Array of variable matches with metadata
   */
  findVariables(html) {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    
    while ((match = variableRegex.exec(html)) !== null) {
      const variableName = match[1].trim();
      if (variableName) {
        matches.push({
          fullMatch: match[0],
          variableName,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    return matches;
  }

  /**
   * Get replacement value for a variable
   * @param {string} variableName - Name of the variable
   * @param {Object} data - Normalized data object
   * @param {Object} defaultValues - Default values
   * @param {Object} options - Replacement options
   * @returns {Object} Replacement result
   */
  getReplacementValue(variableName, data, defaultValues, options) {
    // Try to get value from data
    let value = this.getNestedValue(data, variableName);
    let source = 'data';
    
    // If not found in data, try default values
    if (value === undefined || value === null) {
      value = defaultValues[variableName];
      source = 'default';
    }
    
    // If still not found, try flattened data key
    if (value === undefined || value === null) {
      value = data[variableName];
      source = 'data-flat';
    }
    
    if (value !== undefined && value !== null) {
      // Process the value
      const processedValue = this.processValue(value, variableName, options);
      
      return {
        found: true,
        value: processedValue,
        source,
        originalValue: value
      };
    }
    
    return {
      found: false,
      value: null,
      source: null
    };
  }

  /**
   * Normalize data object for easier variable access
   * @param {Object} data - Original data object
   * @returns {Object} Normalized data object
   */
  normalizeData(data) {
    const normalized = { ...data };
    
    // If data has nested structure, flatten it for easier access
    this.flattenObject(data, normalized, '');
    
    return normalized;
  }

  /**
   * Flatten nested object to support dot notation
   * @param {Object} obj - Object to flatten
   * @param {Object} result - Result object
   * @param {string} prefix - Key prefix
   */
  flattenObject(obj, result, prefix) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        this.flattenObject(value, result, newKey);
      } else {
        // Store the flattened value
        result[newKey] = value;
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path (e.g., 'property.city')
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Process value before replacement (formatting, escaping, etc.)
   * @param {*} value - Original value
   * @param {string} variableName - Variable name
   * @param {Object} options - Processing options
   * @returns {string} Processed value
   */
  processValue(value, variableName, options) {
    // Convert to string
    let processed = String(value);
    
    // Apply HTML escaping if requested
    if (options.escapeHtml !== false) {
      processed = this.escapeHtml(processed);
    }
    
    // Apply formatting based on variable type or name
    processed = this.applyFormatting(processed, variableName, options);
    
    return processed;
  }

  /**
   * Apply formatting based on variable name patterns
   * @param {string} value - Value to format
   * @param {string} variableName - Variable name for context
   * @param {Object} options - Formatting options
   * @returns {string} Formatted value
   */
  applyFormatting(value, variableName, options) {
    const name = variableName.toLowerCase();
    
    // Price/currency formatting
    if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
      return this.formatCurrency(value);
    }
    
    // Phone number formatting
    if (name.includes('phone') || name.includes('tel')) {
      return this.formatPhoneNumber(value);
    }
    
    // URL formatting
    if (name.includes('website') || name.includes('url') || name.includes('link')) {
      return this.formatUrl(value);
    }
    
    // Square footage formatting
    if (name.includes('sqft') || name.includes('square')) {
      return this.formatNumber(value) + (value && !value.toString().includes('sq') ? ' sq ft' : '');
    }
    
    return value;
  }

  /**
   * Format currency values
   * @param {string} value - Value to format
   * @returns {string} Formatted currency
   */
  formatCurrency(value) {
    if (!value) return value;
    
    const str = value.toString().replace(/[,$]/g, '');
    const num = parseFloat(str);
    
    if (isNaN(num)) return value;
    
    // If it's already formatted, return as is
    if (value.toString().includes('$')) return value;
    
    return '$' + num.toLocaleString();
  }

  /**
   * Format phone numbers
   * @param {string} value - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(value) {
    if (!value) return value;
    
    // Remove all non-digits
    const digits = value.toString().replace(/\D/g, '');
    
    // Format 10-digit US phone numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return value;
  }

  /**
   * Format URLs
   * @param {string} value - URL to format
   * @returns {string} Formatted URL
   */
  formatUrl(value) {
    if (!value) return value;
    
    const url = value.toString();
    
    // Add https:// if no protocol
    if (url && !url.includes('://')) {
      return 'https://' + url;
    }
    
    return url;
  }

  /**
   * Format numbers with commas
   * @param {string|number} value - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(value) {
    if (!value) return value;
    
    const num = parseFloat(value.toString().replace(/,/g, ''));
    
    if (isNaN(num)) return value;
    
    return num.toLocaleString();
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Generate a preview of what will be replaced
   * @param {string} htmlTemplate - HTML template
   * @param {Object} data - Data object
   * @param {Object} defaultValues - Default values
   * @returns {Array} Preview of replacements
   */
  previewReplacements(htmlTemplate, data = {}, defaultValues = {}) {
    const normalizedData = this.normalizeData(data);
    const variableMatches = this.findVariables(htmlTemplate);
    
    return variableMatches.map(match => {
      const { variableName, fullMatch } = match;
      const replacement = this.getReplacementValue(
        variableName, 
        normalizedData, 
        defaultValues, 
        { escapeHtml: false }
      );
      
      return {
        variable: variableName,
        current: fullMatch,
        willBecome: replacement.found ? replacement.value : '[MISSING]',
        source: replacement.source || 'missing',
        found: replacement.found
      };
    });
  }

  /**
   * Get statistics about variables in template
   * @param {string} htmlTemplate - HTML template
   * @param {Object} data - Data object
   * @param {Object} defaultValues - Default values
   * @returns {Object} Variable statistics
   */
  analyzeTemplate(htmlTemplate, data = {}, defaultValues = {}) {
    const normalizedData = this.normalizeData(data);
    const variableMatches = this.findVariables(htmlTemplate);
    
    const unique = new Set();
    const categories = {};
    let foundInData = 0;
    let foundInDefaults = 0;
    let missing = 0;
    
    variableMatches.forEach(match => {
      const { variableName } = match;
      unique.add(variableName);
      
      // Categorize by prefix
      const category = variableName.split('.')[0] || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
      
      // Check availability
      const replacement = this.getReplacementValue(
        variableName,
        normalizedData,
        defaultValues,
        {}
      );
      
      if (replacement.found) {
        if (replacement.source === 'data' || replacement.source === 'data-flat') {
          foundInData++;
        } else {
          foundInDefaults++;
        }
      } else {
        missing++;
      }
    });
    
    return {
      totalInstances: variableMatches.length,
      uniqueVariables: unique.size,
      categories,
      dataAvailability: {
        foundInData,
        foundInDefaults,
        missing,
        coveragePercent: Math.round((foundInData + foundInDefaults) / variableMatches.length * 100)
      },
      variableList: Array.from(unique).sort()
    };
  }
}

// Create singleton instance
const variableReplacer = new VariableReplacer();

module.exports = {
  variableReplacer,
  VariableReplacer
};