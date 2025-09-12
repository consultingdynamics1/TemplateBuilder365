/**
 * Content Processor Service
 * Handles template variables and raw content in TB365 elements
 */

class ContentProcessor {
  /**
   * Process content from TB365 elements
   * @param {Array} elements - Parsed TB365 elements
   * @returns {Object} Processed content with variables and raw content
   */
  processContent(elements) {
    const processed = {
      textElements: [],
      tableCells: [],
      variables: new Map(), // variableName -> metadata
      rawContent: new Map(), // elementId -> raw content
      mixedContent: new Map(), // elementId -> mixed content structure
      statistics: {
        totalElements: 0,
        elementsWithVariables: 0,
        elementsWithRawContent: 0,
        elementsWithMixedContent: 0,
        totalVariables: 0,
        uniqueVariables: 0
      }
    };

    console.log(`Processing content from ${elements.length} elements...`);

    elements.forEach(element => {
      if (element.type === 'text') {
        this.processTextElement(element, processed);
      } else if (element.type === 'table' && element.table) {
        this.processTableElement(element, processed);
      }
    });

    // Generate final statistics
    processed.statistics.uniqueVariables = processed.variables.size;
    processed.statistics.totalElements = processed.textElements.length + processed.tableCells.length;

    console.log(`Content processing complete:`, {
      totalElements: processed.statistics.totalElements,
      uniqueVariables: processed.statistics.uniqueVariables,
      totalVariables: processed.statistics.totalVariables,
      mixedContent: processed.statistics.elementsWithMixedContent
    });

    return processed;
  }

  /**
   * Process a single text element
   * @param {Object} element - Text element
   * @param {Object} processed - Processed content object
   */
  processTextElement(element, processed) {
    const analysis = this.analyzeContent(element.content);
    
    const textElement = {
      id: element.id,
      name: element.name,
      originalContent: element.content,
      contentType: analysis.type,
      hasVariables: analysis.hasVariables,
      hasRawContent: analysis.hasRawContent,
      processedContent: analysis.processedContent,
      variables: analysis.variables,
      position: element.position,
      styling: element.styling
    };

    processed.textElements.push(textElement);

    // Update statistics
    if (analysis.hasVariables) processed.statistics.elementsWithVariables++;
    if (analysis.hasRawContent) processed.statistics.elementsWithRawContent++;
    if (analysis.type === 'mixed') processed.statistics.elementsWithMixedContent++;

    // Store content by type
    if (analysis.type === 'raw') {
      processed.rawContent.set(element.id, analysis.processedContent);
    } else if (analysis.type === 'mixed') {
      processed.mixedContent.set(element.id, analysis);
    }

    // Collect variables
    analysis.variables.forEach(variable => {
      this.addVariable(variable, element, processed.variables);
      processed.statistics.totalVariables++;
    });
  }

  /**
   * Process table element cells
   * @param {Object} element - Table element
   * @param {Object} processed - Processed content object
   */
  processTableElement(element, processed) {
    element.table.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const analysis = this.analyzeContent(cell.content);
        
        const tableCell = {
          elementId: element.id,
          elementName: element.name,
          row: rowIndex,
          column: colIndex,
          isHeader: cell.isHeader,
          originalContent: cell.content,
          contentType: analysis.type,
          hasVariables: analysis.hasVariables,
          hasRawContent: analysis.hasRawContent,
          processedContent: analysis.processedContent,
          variables: analysis.variables
        };

        processed.tableCells.push(tableCell);

        // Update statistics
        if (analysis.hasVariables) processed.statistics.elementsWithVariables++;
        if (analysis.hasRawContent) processed.statistics.elementsWithRawContent++;
        if (analysis.type === 'mixed') processed.statistics.elementsWithMixedContent++;

        // Store content by type
        const cellId = `${element.id}_${rowIndex}_${colIndex}`;
        if (analysis.type === 'raw') {
          processed.rawContent.set(cellId, analysis.processedContent);
        } else if (analysis.type === 'mixed') {
          processed.mixedContent.set(cellId, analysis);
        }

        // Collect variables
        analysis.variables.forEach(variable => {
          this.addVariable(variable, { ...element, cellPosition: { row: rowIndex, column: colIndex } }, processed.variables);
          processed.statistics.totalVariables++;
        });
      });
    });
  }

  /**
   * Analyze content to determine type and extract components
   * @param {string} content - Content to analyze
   * @returns {Object} Content analysis result
   */
  analyzeContent(content) {
    if (!content || typeof content !== 'string') {
      return {
        type: 'empty',
        hasVariables: false,
        hasRawContent: false,
        processedContent: '',
        variables: [],
        rawParts: [],
        structure: []
      };
    }

    // Extract variables using regex
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    const variableMatches = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (variableName) {
        variables.push(variableName);
        variableMatches.push({
          fullMatch: match[0], // {{variable.name}}
          variableName,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    const hasVariables = variables.length > 0;
    
    // Check for raw content (text outside of variables)
    let rawContent = content;
    variableMatches.forEach(match => {
      rawContent = rawContent.replace(match.fullMatch, '');
    });
    const hasRawContent = rawContent.trim().length > 0;

    // Determine content type
    let type;
    if (hasVariables && hasRawContent) {
      type = 'mixed';
    } else if (hasVariables) {
      type = 'template';
    } else if (hasRawContent) {
      type = 'raw';
    } else {
      type = 'empty';
    }

    // Create structured representation for mixed content
    const structure = this.parseContentStructure(content, variableMatches);

    return {
      type,
      hasVariables,
      hasRawContent,
      processedContent: this.generateProcessedContent(content, type, variables),
      variables: Array.from(new Set(variables)), // Remove duplicates
      rawParts: this.extractRawParts(content, variableMatches),
      structure,
      originalLength: content.length,
      variableCount: variables.length
    };
  }

  /**
   * Parse content structure for mixed content
   * @param {string} content - Original content
   * @param {Array} variableMatches - Variable match data
   * @returns {Array} Structured content representation
   */
  parseContentStructure(content, variableMatches) {
    if (variableMatches.length === 0) {
      return [{ type: 'text', content }];
    }

    const structure = [];
    let lastIndex = 0;

    variableMatches.forEach(match => {
      // Add text before variable (if any)
      if (match.startIndex > lastIndex) {
        const textContent = content.substring(lastIndex, match.startIndex);
        if (textContent) {
          structure.push({ type: 'text', content: textContent });
        }
      }

      // Add variable
      structure.push({
        type: 'variable',
        content: match.fullMatch,
        variableName: match.variableName
      });

      lastIndex = match.endIndex;
    });

    // Add remaining text after last variable (if any)
    if (lastIndex < content.length) {
      const textContent = content.substring(lastIndex);
      if (textContent) {
        structure.push({ type: 'text', content: textContent });
      }
    }

    return structure;
  }

  /**
   * Extract raw text parts from content
   * @param {string} content - Original content
   * @param {Array} variableMatches - Variable matches
   * @returns {Array} Raw text parts
   */
  extractRawParts(content, variableMatches) {
    let rawContent = content;
    variableMatches.forEach(match => {
      rawContent = rawContent.replace(match.fullMatch, '|||VARIABLE|||');
    });
    
    return rawContent
      .split('|||VARIABLE|||')
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }

  /**
   * Generate processed content based on type
   * @param {string} content - Original content
   * @param {string} type - Content type
   * @param {Array} variables - Extracted variables
   * @returns {string} Processed content for output
   */
  generateProcessedContent(content, type, variables) {
    switch (type) {
      case 'raw':
        return content; // Use raw content as-is
        
      case 'template':
        return content; // Preserve template variables for data binding
        
      case 'mixed':
        // For mixed content, we preserve the original structure
        // The consuming system can decide how to handle it
        return content;
        
      case 'empty':
        return '';
        
      default:
        return content;
    }
  }

  /**
   * Add variable to collection with metadata
   * @param {string} variableName - Variable name
   * @param {Object} element - Source element
   * @param {Map} variablesMap - Variables collection
   */
  addVariable(variableName, element, variablesMap) {
    if (!variablesMap.has(variableName)) {
      variablesMap.set(variableName, {
        name: variableName,
        type: this.inferVariableType(variableName),
        usedInElements: [],
        defaultValue: this.generateDefaultValue(variableName),
        description: this.generateVariableDescription(variableName),
        required: true,
        category: this.categorizeVariable(variableName)
      });
    }

    const variable = variablesMap.get(variableName);
    variable.usedInElements.push({
      elementId: element.id,
      elementName: element.name,
      elementType: element.type,
      cellPosition: element.cellPosition
    });
  }

  /**
   * Infer variable data type from name
   * @param {string} variableName - Variable name
   * @returns {string} Inferred type
   */
  inferVariableType(variableName) {
    const name = variableName.toLowerCase();
    
    if (name.match(/(price|amount|cost|fee|total|sum|value)/)) {
      return 'currency';
    }
    if (name.match(/(date|time|year|month|day)/)) {
      return 'date';
    }
    if (name.match(/(email|mail)/)) {
      return 'email';
    }
    if (name.match(/(phone|tel|mobile|cell)/)) {
      return 'phone';
    }
    if (name.match(/(url|website|link)/)) {
      return 'url';
    }
    if (name.match(/(count|number|qty|quantity|bedrooms|bathrooms|sqft|square)/)) {
      return 'number';
    }
    if (name.match(/(address|street|city|state|zip|postal)/)) {
      return 'address';
    }
    
    return 'text';
  }

  /**
   * Generate default value for variable
   * @param {string} variableName - Variable name
   * @returns {string} Default value
   */
  generateDefaultValue(variableName) {
    const name = variableName.toLowerCase();
    const type = this.inferVariableType(variableName);
    
    switch (type) {
      case 'currency':
        return '$0.00';
      case 'date':
        return new Date().toLocaleDateString();
      case 'email':
        return 'example@email.com';
      case 'phone':
        return '(555) 123-4567';
      case 'url':
        return 'https://example.com';
      case 'number':
        return '0';
      case 'address':
        if (name.includes('city')) return 'Your City';
        if (name.includes('state')) return 'State';
        if (name.includes('zip')) return '12345';
        return '123 Main Street';
      default:
        return this.generateContextualDefault(variableName);
    }
  }

  /**
   * Generate contextual default based on variable name
   * @param {string} variableName - Variable name
   * @returns {string} Contextual default
   */
  generateContextualDefault(variableName) {
    const parts = variableName.split('.');
    const context = parts[0]?.toLowerCase();
    const field = parts[1]?.toLowerCase();
    
    const defaults = {
      agency: {
        name: 'Your Real Estate Agency',
        tagline: 'Your Trusted Real Estate Partner',
        website: 'www.youragency.com',
        license: 'License #12345'
      },
      agent: {
        name: 'Agent Name',
        title: 'Real Estate Professional',
        phone: '(555) 123-4567',
        email: 'agent@youragency.com'
      },
      property: {
        address: '123 Main Street',
        city: 'Your City',
        state: 'ST',
        zip: '12345',
        price: '299,000',
        bedrooms: '3',
        bathrooms: '2',
        sqft: '1,500',
        description: 'Beautiful property with great features...'
      },
      neighborhood: {
        school: 'Local School District',
        shopping: 'Shopping Center nearby',
        parks: 'Community Parks',
        walkScore: '75'
      }
    };
    
    return defaults[context]?.[field] || `{{${variableName}}}`;
  }

  /**
   * Generate variable description
   * @param {string} variableName - Variable name
   * @returns {string} Description
   */
  generateVariableDescription(variableName) {
    const parts = variableName.split('.');
    const context = parts[0];
    const field = parts[1];
    
    if (parts.length === 2) {
      return `${field} for ${context}`;
    }
    
    return `Variable: ${variableName}`;
  }

  /**
   * Categorize variable by context
   * @param {string} variableName - Variable name
   * @returns {string} Category
   */
  categorizeVariable(variableName) {
    const context = variableName.split('.')[0]?.toLowerCase();
    
    const categories = {
      agency: 'Business Information',
      agent: 'Agent Details',
      property: 'Property Information',
      neighborhood: 'Location Details',
      legal: 'Legal Information',
      contact: 'Contact Information'
    };
    
    return categories[context] || 'General';
  }

  /**
   * Generate data.json structure for API Template
   * @param {Object} processedContent - Processed content data
   * @returns {Object} Data structure for API Template
   */
  generateDataStructure(processedContent) {
    const data = {
      variables: {},
      defaultValues: {},
      schema: {
        type: 'object',
        properties: {},
        required: []
      },
      categories: {},
      statistics: processedContent.statistics
    };

    // Process each variable
    processedContent.variables.forEach((variable, variableName) => {
      // Add to variables collection
      data.variables[variableName] = {
        type: variable.type,
        description: variable.description,
        category: variable.category,
        required: variable.required,
        usedInElements: variable.usedInElements.length,
        elements: variable.usedInElements
      };

      // Add default value
      data.defaultValues[variableName] = variable.defaultValue;

      // Add to JSON schema
      data.schema.properties[variableName] = {
        type: variable.type === 'number' ? 'number' : 'string',
        description: variable.description,
        default: variable.defaultValue
      };

      if (variable.required) {
        data.schema.required.push(variableName);
      }

      // Group by category
      if (!data.categories[variable.category]) {
        data.categories[variable.category] = [];
      }
      data.categories[variable.category].push(variableName);
    });

    return data;
  }

  /**
   * Generate sample data for testing
   * @param {Object} dataStructure - Data structure
   * @returns {Object} Sample data
   */
  generateSampleData(dataStructure) {
    const sampleData = { ...dataStructure.defaultValues };
    
    // You can customize sample data here for more realistic testing
    return sampleData;
  }
}

// Create singleton instance
const contentProcessor = new ContentProcessor();

module.exports = {
  contentProcessor,
  ContentProcessor
};