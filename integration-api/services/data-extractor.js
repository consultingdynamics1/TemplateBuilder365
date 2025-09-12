/**
 * Data Extractor Service
 * Extracts data variables and schema from TB365 projects
 */

class DataExtractor {
  /**
   * Extract variables and data schema from parsed TB365 data
   * @param {Object} parsedData - Parsed TB365 data
   * @returns {Object} Variables, default values, and schema
   */
  extractVariables(parsedData) {
    try {
      console.log(`Extracting data variables from ${parsedData.elements.length} elements`);
      
      const variables = new Map();
      const defaultValues = {};
      const schema = {
        type: 'object',
        properties: {},
        required: []
      };
      
      // Extract variables from text elements
      this.extractTextVariables(parsedData.textContent.textElements, variables, defaultValues, schema);
      
      // Extract variables from table elements
      this.extractTableVariables(parsedData.textContent.tableCells, variables, defaultValues, schema);
      
      // Extract variables from image elements
      this.extractImageVariables(parsedData.elements, variables, defaultValues, schema);
      
      // Generate additional metadata variables
      this.generateMetadataVariables(parsedData, variables, defaultValues, schema);
      
      const result = {
        variables: Array.from(variables.values()),
        defaultValues,
        schema,
        statistics: {
          totalVariables: variables.size,
          textVariables: this.countVariablesByType(variables, 'text'),
          imageVariables: this.countVariablesByType(variables, 'image'),
          tableVariables: this.countVariablesByType(variables, 'table'),
          metadataVariables: this.countVariablesByType(variables, 'metadata')
        }
      };
      
      console.log(`Extracted ${variables.size} variables with ${result.statistics.textVariables} text, ${result.statistics.imageVariables} image, ${result.statistics.tableVariables} table variables`);
      
      return result;
    } catch (error) {
      console.error('Error extracting variables:', error);
      throw new Error(`Variable extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract variables from text elements
   */
  extractTextVariables(textElements, variables, defaultValues, schema) {
    textElements.forEach(element => {
      // Look for variables in text content ({{variable}} format)
      const foundVariables = this.findVariablesInText(element.content);
      
      foundVariables.forEach(variable => {
        const variableInfo = {
          name: variable,
          type: 'text',
          elementId: element.id,
          elementName: element.name,
          originalText: element.content,
          position: element.position,
          dataType: this.inferDataType(variable),
          required: true,
          description: `Text variable from ${element.name}`
        };
        
        variables.set(variable, variableInfo);
        defaultValues[variable] = this.generateDefaultValue(variable, 'text');
        
        // Add to JSON schema
        schema.properties[variable] = {
          type: variableInfo.dataType === 'number' ? 'number' : 'string',
          description: variableInfo.description,
          default: defaultValues[variable]
        };
        schema.required.push(variable);
      });
      
      // If no variables found, create one for the entire text content
      if (foundVariables.length === 0 && element.content) {
        const variableName = this.generateVariableName(element.name, 'content');
        const variableInfo = {
          name: variableName,
          type: 'text',
          elementId: element.id,
          elementName: element.name,
          originalText: element.content,
          position: element.position,
          dataType: 'string',
          required: false,
          description: `Full text content for ${element.name}`
        };
        
        variables.set(variableName, variableInfo);
        defaultValues[variableName] = element.content;
        
        schema.properties[variableName] = {
          type: 'string',
          description: variableInfo.description,
          default: element.content
        };
      }
    });
  }

  /**
   * Extract variables from table cells
   */
  extractTableVariables(tableCells, variables, defaultValues, schema) {
    const tableElements = new Map();
    
    // Group cells by element
    tableCells.forEach(cell => {
      if (!tableElements.has(cell.elementId)) {
        tableElements.set(cell.elementId, []);
      }
      tableElements.get(cell.elementId).push(cell);
    });
    
    tableElements.forEach((cells, elementId) => {
      const element = cells[0]; // Get element info from first cell
      
      cells.forEach(cell => {
        // Look for variables in cell content
        const foundVariables = this.findVariablesInText(cell.content);
        
        foundVariables.forEach(variable => {
          const variableInfo = {
            name: variable,
            type: 'table',
            elementId: elementId,
            elementName: element.elementName || `table-${elementId}`,
            cellPosition: {
              row: cell.row,
              column: cell.column
            },
            isHeader: cell.isHeader,
            originalText: cell.content,
            dataType: this.inferDataType(variable),
            required: !cell.isHeader, // Headers are usually optional
            description: `Table cell variable from row ${cell.row}, column ${cell.column}${cell.isHeader ? ' (header)' : ''}`
          };
          
          variables.set(variable, variableInfo);
          defaultValues[variable] = this.generateDefaultValue(variable, 'table');
          
          schema.properties[variable] = {
            type: variableInfo.dataType === 'number' ? 'number' : 'string',
            description: variableInfo.description,
            default: defaultValues[variable]
          };
          
          if (variableInfo.required) {
            schema.required.push(variable);
          }
        });
        
        // If no variables found, create one for the cell content
        if (foundVariables.length === 0 && cell.content) {
          const variableName = this.generateVariableName(
            element.elementName || `table-${elementId}`, 
            `${cell.row}_${cell.column}`
          );
          
          const variableInfo = {
            name: variableName,
            type: 'table',
            elementId: elementId,
            elementName: element.elementName || `table-${elementId}`,
            cellPosition: {
              row: cell.row,
              column: cell.column
            },
            isHeader: cell.isHeader,
            originalText: cell.content,
            dataType: 'string',
            required: false,
            description: `Table cell content from row ${cell.row}, column ${cell.column}${cell.isHeader ? ' (header)' : ''}`
          };
          
          variables.set(variableName, variableInfo);
          defaultValues[variableName] = cell.content;
          
          schema.properties[variableName] = {
            type: 'string',
            description: variableInfo.description,
            default: cell.content
          };
        }
      });
    });
  }

  /**
   * Extract variables from image elements
   */
  extractImageVariables(elements, variables, defaultValues, schema) {
    const imageElements = elements.filter(el => el.type === 'image');
    
    imageElements.forEach(element => {
      const variableName = this.generateVariableName(element.name, 'url');
      const variableInfo = {
        name: variableName,
        type: 'image',
        elementId: element.id,
        elementName: element.name,
        originalSrc: element.src,
        position: element.position,
        size: element.size,
        dataType: 'string',
        format: 'url',
        required: true,
        description: `Image URL for ${element.name}`
      };
      
      variables.set(variableName, variableInfo);
      defaultValues[variableName] = element.src || 'https://via.placeholder.com/300x200?text=Image';
      
      schema.properties[variableName] = {
        type: 'string',
        format: 'uri',
        description: variableInfo.description,
        default: defaultValues[variableName]
      };
      schema.required.push(variableName);
      
      // Also create an alt text variable
      const altVariableName = this.generateVariableName(element.name, 'alt');
      const altVariableInfo = {
        name: altVariableName,
        type: 'image',
        elementId: element.id,
        elementName: element.name,
        dataType: 'string',
        required: false,
        description: `Alt text for ${element.name}`
      };
      
      variables.set(altVariableName, altVariableInfo);
      defaultValues[altVariableName] = element.name;
      
      schema.properties[altVariableName] = {
        type: 'string',
        description: altVariableInfo.description,
        default: element.name
      };
    });
  }

  /**
   * Generate metadata variables
   */
  generateMetadataVariables(parsedData, variables, defaultValues, schema) {
    // Project metadata variables
    const metadataVars = [
      {
        name: 'project_name',
        value: parsedData.projectName,
        description: 'Project name'
      },
      {
        name: 'generation_date',
        value: new Date().toISOString(),
        description: 'Template generation date'
      },
      {
        name: 'canvas_width',
        value: parsedData.canvas.size.width,
        description: 'Canvas width in pixels',
        dataType: 'number'
      },
      {
        name: 'canvas_height',
        value: parsedData.canvas.size.height,
        description: 'Canvas height in pixels',
        dataType: 'number'
      },
      {
        name: 'total_elements',
        value: parsedData.statistics.totalElements,
        description: 'Total number of elements',
        dataType: 'number'
      }
    ];
    
    metadataVars.forEach(meta => {
      const variableInfo = {
        name: meta.name,
        type: 'metadata',
        dataType: meta.dataType || 'string',
        required: false,
        description: meta.description,
        readonly: true
      };
      
      variables.set(meta.name, variableInfo);
      defaultValues[meta.name] = meta.value;
      
      schema.properties[meta.name] = {
        type: meta.dataType === 'number' ? 'number' : 'string',
        description: meta.description,
        default: meta.value,
        readOnly: true
      };
    });
  }

  /**
   * Find variables in text using {{variable}} syntax
   */
  findVariablesInText(text) {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
      const variableName = match[1].trim();
      if (variableName && !variables.includes(variableName)) {
        variables.push(variableName);
      }
    }
    
    return variables;
  }

  /**
   * Generate a clean variable name
   */
  generateVariableName(elementName, suffix) {
    const cleanName = elementName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return suffix ? `${cleanName}_${suffix}` : cleanName;
  }

  /**
   * Infer data type from variable name
   */
  inferDataType(variableName) {
    const lowerName = variableName.toLowerCase();
    
    // Number patterns
    if (lowerName.match(/(count|number|amount|price|quantity|total|sum|age|year|month|day|hour|minute|second|percent|percentage|rate|score|rating|index|id)/)) {
      return 'number';
    }
    
    // Boolean patterns
    if (lowerName.match(/(is|has|can|should|enabled|disabled|active|inactive|visible|hidden|true|false)/)) {
      return 'boolean';
    }
    
    // Date patterns
    if (lowerName.match(/(date|time|timestamp|created|updated|modified|expires|start|end)/)) {
      return 'date';
    }
    
    // URL patterns
    if (lowerName.match(/(url|link|href|src|image|photo|avatar)/)) {
      return 'url';
    }
    
    // Email patterns
    if (lowerName.match(/(email|mail)/)) {
      return 'email';
    }
    
    // Default to string
    return 'string';
  }

  /**
   * Generate default value based on variable name and type
   */
  generateDefaultValue(variableName, type) {
    const lowerName = variableName.toLowerCase();
    const dataType = this.inferDataType(variableName);
    
    switch (dataType) {
      case 'number':
        if (lowerName.includes('price') || lowerName.includes('amount')) return 0.00;
        if (lowerName.includes('percent') || lowerName.includes('rate')) return 0;
        if (lowerName.includes('year')) return new Date().getFullYear();
        return 0;
        
      case 'boolean':
        return false;
        
      case 'date':
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
      case 'url':
        if (lowerName.includes('image') || lowerName.includes('photo') || lowerName.includes('avatar')) {
          return 'https://via.placeholder.com/300x200?text=Image';
        }
        return 'https://example.com';
        
      case 'email':
        return 'example@email.com';
        
      default:
        // Generate contextual default text
        if (lowerName.includes('name')) return 'Your Name';
        if (lowerName.includes('title')) return 'Your Title';
        if (lowerName.includes('description')) return 'Your description here...';
        if (lowerName.includes('address')) return '123 Main St, City, State 12345';
        if (lowerName.includes('phone')) return '(555) 123-4567';
        if (lowerName.includes('company')) return 'Your Company';
        
        return `{{${variableName}}}`;
    }
  }

  /**
   * Count variables by type
   */
  countVariablesByType(variables, type) {
    return Array.from(variables.values()).filter(variable => variable.type === type).length;
  }

  /**
   * Generate sample data for testing
   */
  generateSampleData(variablesResult) {
    const sampleData = { ...variablesResult.defaultValues };
    
    // Override with more realistic sample data
    variablesResult.variables.forEach(variable => {
      if (variable.type === 'text') {
        sampleData[variable.name] = this.generateSampleText(variable.name);
      } else if (variable.type === 'image') {
        sampleData[variable.name] = this.generateSampleImageUrl(variable.name);
      } else if (variable.type === 'table') {
        sampleData[variable.name] = this.generateSampleTableData(variable.name);
      }
    });
    
    return sampleData;
  }

  /**
   * Generate sample text based on variable name
   */
  generateSampleText(variableName) {
    const lowerName = variableName.toLowerCase();
    
    const samples = {
      name: 'John Smith',
      title: 'Senior Developer',
      company: 'Tech Corp',
      address: '123 Innovation Drive, Tech City, TC 12345',
      phone: '(555) 123-4567',
      email: 'john.smith@techcorp.com',
      description: 'Experienced professional with expertise in modern technologies.',
      price: '$99.99',
      date: new Date().toLocaleDateString()
    };
    
    for (const [key, value] of Object.entries(samples)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }
    
    return 'Sample text';
  }

  /**
   * Generate sample image URL
   */
  generateSampleImageUrl(variableName) {
    const lowerName = variableName.toLowerCase();
    
    if (lowerName.includes('logo')) {
      return 'https://via.placeholder.com/200x100?text=Logo';
    } else if (lowerName.includes('avatar') || lowerName.includes('profile')) {
      return 'https://via.placeholder.com/150x150?text=Avatar';
    } else if (lowerName.includes('banner') || lowerName.includes('header')) {
      return 'https://via.placeholder.com/800x200?text=Banner';
    }
    
    return 'https://via.placeholder.com/300x200?text=Image';
  }

  /**
   * Generate sample table data
   */
  generateSampleTableData(variableName) {
    const lowerName = variableName.toLowerCase();
    
    if (lowerName.includes('header')) {
      return 'Column Header';
    } else if (lowerName.includes('_0_')) {
      return 'Row 1 Data';
    } else if (lowerName.includes('_1_')) {
      return 'Row 2 Data';
    }
    
    return 'Cell Data';
  }
}

// Create singleton instance
const dataExtractor = new DataExtractor();

module.exports = {
  dataExtractor,
  DataExtractor
};