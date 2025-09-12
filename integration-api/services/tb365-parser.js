/**
 * TB365 Parser Service
 * Parses and validates TB365 format from TemplateBuilder365
 */

class TB365Parser {
  /**
   * Parse and validate TB365 project data
   * @param {Object} tb365Data - Raw TB365 project data
   * @returns {Promise<Object>} Parsed and validated project structure
   */
  async parse(tb365Data) {
    try {
      console.log(`Parsing TB365 project: ${tb365Data.projectName}`);
      
      // Step 1: Validate overall structure
      this.validateProjectStructure(tb365Data);
      
      // Step 2: Validate and parse canvas state
      const canvasState = this.validateCanvasState(tb365Data.canvasState);
      
      // Step 3: Validate and categorize elements
      const validatedElements = this.validateAndParseElements(canvasState.elements);
      
      // Step 4: Group elements by type
      const elementGroups = this.groupElementsByType(validatedElements);
      
      // Step 5: Extract canvas properties
      const canvas = this.parseCanvas(canvasState);
      
      // Step 6: Extract text content and variables
      const textContent = this.extractTextContent(validatedElements);
      
      // Step 7: Extract styling information
      const styles = this.extractStyles(validatedElements);
      
      // Step 8: Extract layout information
      const layout = this.extractLayout(validatedElements, canvas);
      
      const parsedData = {
        projectName: tb365Data.projectName,
        version: tb365Data.version,
        savedAt: tb365Data.savedAt,
        canvas,
        elements: validatedElements,
        elementGroups,
        textContent,
        styles,
        layout,
        statistics: this.generateStatistics(validatedElements),
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          parsedAt: new Date().toISOString()
        }
      };
      
      console.log(`Successfully parsed TB365 project:`, {
        elements: validatedElements.length,
        rectangles: elementGroups.rectangles.length,
        text: elementGroups.text.length,
        images: elementGroups.images.length,
        tables: elementGroups.tables.length,
        variables: textContent.variables.length
      });
      
      return parsedData;
    } catch (error) {
      console.error('TB365 parsing failed:', error);
      
      const errorData = {
        projectName: tb365Data?.projectName || 'Unknown',
        version: tb365Data?.version || 'Unknown',
        savedAt: tb365Data?.savedAt || null,
        canvas: null,
        elements: [],
        elementGroups: { rectangles: [], text: [], images: [], tables: [] },
        textContent: { textElements: [], tableCells: [], variables: [] },
        styles: { fonts: [], colors: [], fontSizes: [], uniqueStyles: [] },
        layout: null,
        statistics: { totalElements: 0, elementTypes: {}, averageSize: {}, totalArea: 0 },
        validation: {
          isValid: false,
          errors: [error.message],
          warnings: [],
          parsedAt: new Date().toISOString(),
          failedStage: error.stage || 'unknown'
        }
      };
      
      throw new Error(`TB365 parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate overall TB365 project structure
   */
  validateProjectStructure(tb365Data) {
    const errors = [];
    
    if (!tb365Data || typeof tb365Data !== 'object') {
      errors.push('TB365 data must be a valid object');
    }
    
    if (!tb365Data.projectName || typeof tb365Data.projectName !== 'string') {
      errors.push('Missing or invalid projectName (must be string)');
    }
    
    if (!tb365Data.version || typeof tb365Data.version !== 'string') {
      errors.push('Missing or invalid version (must be string)');
    }
    
    if (!tb365Data.savedAt || typeof tb365Data.savedAt !== 'string') {
      errors.push('Missing or invalid savedAt timestamp (must be string)');
    }
    
    if (!tb365Data.canvasState || typeof tb365Data.canvasState !== 'object') {
      errors.push('Missing or invalid canvasState (must be object)');
    }
    
    if (errors.length > 0) {
      const error = new Error(`TB365 structure validation failed: ${errors.join(', ')}`);
      error.stage = 'structure_validation';
      throw error;
    }
    
    console.log('✅ TB365 project structure validation passed');
  }

  /**
   * Validate canvas state structure
   */
  validateCanvasState(canvasState) {
    const errors = [];
    
    if (!Array.isArray(canvasState.elements)) {
      errors.push('canvasState.elements must be an array');
    }
    
    if (!canvasState.canvasSize || typeof canvasState.canvasSize !== 'object') {
      errors.push('canvasState.canvasSize must be an object');
    } else {
      if (typeof canvasState.canvasSize.width !== 'number' || canvasState.canvasSize.width <= 0) {
        errors.push('canvasState.canvasSize.width must be a positive number');
      }
      if (typeof canvasState.canvasSize.height !== 'number' || canvasState.canvasSize.height <= 0) {
        errors.push('canvasState.canvasSize.height must be a positive number');
      }
    }
    
    if (typeof canvasState.zoom !== 'number' || canvasState.zoom <= 0) {
      errors.push('canvasState.zoom must be a positive number');
    }
    
    if (typeof canvasState.snapToGrid !== 'boolean') {
      errors.push('canvasState.snapToGrid must be a boolean');
    }
    
    if (typeof canvasState.gridSize !== 'number' || canvasState.gridSize <= 0) {
      errors.push('canvasState.gridSize must be a positive number');
    }
    
    const validTools = ['select', 'text', 'rectangle', 'image', 'table'];
    if (!validTools.includes(canvasState.activeTool)) {
      errors.push(`canvasState.activeTool must be one of: ${validTools.join(', ')}`);
    }
    
    if (errors.length > 0) {
      const error = new Error(`Canvas state validation failed: ${errors.join(', ')}`);
      error.stage = 'canvas_validation';
      throw error;
    }
    
    console.log('✅ Canvas state validation passed');
    return canvasState;
  }

  /**
   * Validate and parse all elements
   */
  validateAndParseElements(rawElements) {
    const validatedElements = [];
    const errors = [];
    
    if (!Array.isArray(rawElements)) {
      throw new Error('Elements must be an array');
    }
    
    rawElements.forEach((element, index) => {
      try {
        const validatedElement = this.validateElement(element, index);
        const parsedElement = this.parseElement(validatedElement, index);
        validatedElements.push(parsedElement);
      } catch (elementError) {
        const error = `Element ${index} (${element?.id || 'unknown'}): ${elementError.message}`;
        errors.push(error);
        console.warn(error);
      }
    });
    
    if (errors.length > 0) {
      const error = new Error(`Element validation failed: ${errors.join('; ')}`);
      error.stage = 'element_validation';
      throw error;
    }
    
    console.log(`✅ Validated ${validatedElements.length} elements successfully`);
    return validatedElements;
  }

  /**
   * Validate a single element
   */
  validateElement(element, index) {
    const errors = [];
    const elementId = element?.id || `element-${index}`;
    
    // Required base properties
    if (!element || typeof element !== 'object') errors.push('Must be a valid object');
    if (!element.id || typeof element.id !== 'string') errors.push('Must have valid id');
    if (!element.type || typeof element.type !== 'string') errors.push('Must have valid type');
    if (!element.name || typeof element.name !== 'string') errors.push('Must have valid name');
    
    // Validate element type
    const validTypes = ['text', 'rectangle', 'image', 'table'];
    if (element.type && !validTypes.includes(element.type)) {
      errors.push(`Invalid type '${element.type}'. Must be: ${validTypes.join(', ')}`);
    }
    
    // Validate position
    if (!element.position || typeof element.position !== 'object') {
      errors.push('Must have valid position object');
    } else {
      if (typeof element.position.x !== 'number') errors.push('position.x must be number');
      if (typeof element.position.y !== 'number') errors.push('position.y must be number');
    }
    
    // Validate size
    if (!element.size || typeof element.size !== 'object') {
      errors.push('Must have valid size object');
    } else {
      if (typeof element.size.width !== 'number' || element.size.width <= 0) {
        errors.push('size.width must be positive number');
      }
      if (typeof element.size.height !== 'number' || element.size.height <= 0) {
        errors.push('size.height must be positive number');
      }
    }
    
    // Validate boolean properties
    if (typeof element.visible !== 'boolean') errors.push('visible must be boolean');
    if (typeof element.locked !== 'boolean') errors.push('locked must be boolean');
    if (typeof element.zIndex !== 'number') errors.push('zIndex must be number');
    
    // Type-specific validation
    if (element.type) {
      this.validateElementTypeSpecific(element, errors);
    }
    
    if (errors.length > 0) {
      throw new Error(`${elementId}: ${errors.join(', ')}`);
    }
    
    return element;
  }

  /**
   * Validate type-specific properties
   */
  validateElementTypeSpecific(element, errors) {
    switch (element.type) {
      case 'text':
        if (typeof element.content !== 'string') errors.push('content must be string');
        if (typeof element.fontSize !== 'number' || element.fontSize <= 0) errors.push('fontSize must be positive');
        if (typeof element.fontFamily !== 'string') errors.push('fontFamily must be string');
        if (!['normal', 'bold'].includes(element.fontWeight)) errors.push('fontWeight must be normal/bold');
        if (!['normal', 'italic'].includes(element.fontStyle)) errors.push('fontStyle must be normal/italic');
        if (!['left', 'center', 'right'].includes(element.textAlign)) errors.push('textAlign must be left/center/right');
        if (!element.color?.match(/^#[0-9A-Fa-f]{6}$/)) errors.push('color must be valid hex');
        if (typeof element.padding !== 'number' || element.padding < 0) errors.push('padding must be non-negative');
        break;
        
      case 'rectangle':
        if (!element.fill?.match(/^(#[0-9A-Fa-f]{6}|transparent)$/)) errors.push('fill must be hex or transparent');
        if (!element.stroke?.match(/^#[0-9A-Fa-f]{6}$/)) errors.push('stroke must be valid hex');
        if (typeof element.strokeWidth !== 'number' || element.strokeWidth < 0) errors.push('strokeWidth must be non-negative');
        if (typeof element.cornerRadius !== 'number' || element.cornerRadius < 0) errors.push('cornerRadius must be non-negative');
        break;
        
      case 'image':
        if (typeof element.src !== 'string') errors.push('src must be string');
        if (typeof element.opacity !== 'number' || element.opacity < 0 || element.opacity > 1) errors.push('opacity must be 0-1');
        if (!['fill', 'contain', 'cover', 'stretch'].includes(element.fit)) errors.push('fit must be fill/contain/cover/stretch');
        break;
        
      case 'table':
        if (typeof element.rows !== 'number' || element.rows <= 0) errors.push('rows must be positive');
        if (typeof element.columns !== 'number' || element.columns <= 0) errors.push('columns must be positive');
        if (!Array.isArray(element.cells)) errors.push('cells must be array');
        if (typeof element.cellPadding !== 'number' || element.cellPadding < 0) errors.push('cellPadding must be non-negative');
        if (!element.borderColor?.match(/^#[0-9A-Fa-f]{6}$/)) errors.push('borderColor must be valid hex');
        break;
    }
  }

  /**
   * Parse and enhance a validated element
   */
  parseElement(element, index) {
    const baseElement = {
      id: element.id,
      name: element.name,
      type: element.type,
      position: element.position,
      size: element.size,
      zIndex: element.zIndex,
      visible: element.visible,
      locked: element.locked,
      renderOrder: index
    };

    switch (element.type) {
      case 'text':
        return {
          ...baseElement,
          content: element.content,
          styling: {
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            textAlign: element.textAlign,
            color: element.color,
            backgroundColor: element.backgroundColor,
            padding: element.padding
          }
        };

      case 'rectangle':
        return {
          ...baseElement,
          styling: {
            fill: element.fill,
            stroke: element.stroke,
            strokeWidth: element.strokeWidth,
            cornerRadius: element.cornerRadius
          }
        };

      case 'image':
        return {
          ...baseElement,
          src: element.src,
          styling: {
            opacity: element.opacity,
            fit: element.fit
          }
        };

      case 'table':
        return {
          ...baseElement,
          table: {
            rows: element.rows,
            columns: element.columns,
            cells: element.cells
          },
          styling: {
            cellPadding: element.cellPadding,
            borderWidth: element.borderWidth,
            borderColor: element.borderColor,
            headerBackground: element.headerBackground,
            cellBackground: element.cellBackground,
            textColor: element.textColor,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily
          }
        };

      default:
        return baseElement;
    }
  }

  /**
   * Group validated elements by type
   */
  groupElementsByType(elements) {
    const groups = {
      rectangles: [],
      text: [],
      images: [],
      tables: []
    };

    elements.forEach(element => {
      switch (element.type) {
        case 'rectangle':
          groups.rectangles.push(element);
          break;
        case 'text':
          groups.text.push(element);
          break;
        case 'image':
          groups.images.push(element);
          break;
        case 'table':
          groups.tables.push(element);
          break;
        default:
          console.warn(`Unknown element type: ${element.type} for element ${element.id}`);
      }
    });

    console.log(`✅ Grouped elements: ${groups.rectangles.length} rectangles, ${groups.text.length} text, ${groups.images.length} images, ${groups.tables.length} tables`);
    
    return groups;
  }

  /**
   * Parse canvas properties
   */
  parseCanvas(canvasState) {
    return {
      size: canvasState.canvasSize,
      zoom: canvasState.zoom,
      snapToGrid: canvasState.snapToGrid,
      gridSize: canvasState.gridSize,
      activeTool: canvasState.activeTool
    };
  }

  /**
   * Extract and process text content and variables
   */
  extractTextContent(elements) {
    // Import content processor
    const { contentProcessor } = require('./content-processor');
    
    // Process content with enhanced content processor
    const processedContent = contentProcessor.processContent(elements);
    
    // Convert to legacy format for backward compatibility while adding new features
    const textContent = {
      textElements: processedContent.textElements.map(element => ({
        id: element.id,
        name: element.name,
        content: element.originalContent,
        position: element.position,
        // Enhanced content analysis
        contentType: element.contentType,
        hasVariables: element.hasVariables,
        hasRawContent: element.hasRawContent,
        processedContent: element.processedContent,
        variables: element.variables
      })),
      tableCells: processedContent.tableCells.map(cell => ({
        elementId: cell.elementId,
        row: cell.row,
        column: cell.column,
        content: cell.originalContent,
        isHeader: cell.isHeader,
        // Enhanced content analysis
        contentType: cell.contentType,
        hasVariables: cell.hasVariables,
        hasRawContent: cell.hasRawContent,
        processedContent: cell.processedContent,
        variables: cell.variables
      })),
      variables: Array.from(processedContent.variables.keys()),
      // Enhanced content processing data
      contentAnalysis: {
        processedContent,
        dataStructure: contentProcessor.generateDataStructure(processedContent),
        sampleData: contentProcessor.generateSampleData(
          contentProcessor.generateDataStructure(processedContent)
        ),
        statistics: processedContent.statistics
      }
    };

    return textContent;
  }

  /**
   * Extract variables from text using {{variable}} syntax
   */
  extractVariables(text) {
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
   * Extract styling information
   */
  extractStyles(elements) {
    const styles = {
      fonts: new Set(),
      colors: new Set(),
      fontSizes: new Set(),
      uniqueStyles: []
    };

    elements.forEach(element => {
      if (element.styling) {
        const elementStyles = { ...element.styling };
        
        // Collect font information
        if (elementStyles.fontFamily) styles.fonts.add(elementStyles.fontFamily);
        if (elementStyles.fontSize) styles.fontSizes.add(elementStyles.fontSize);
        
        // Collect colors
        Object.values(elementStyles).forEach(value => {
          if (typeof value === 'string' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
            styles.colors.add(value);
          }
        });
        
        styles.uniqueStyles.push({
          elementId: element.id,
          elementType: element.type,
          styles: elementStyles
        });
      }
    });

    return {
      fonts: Array.from(styles.fonts),
      colors: Array.from(styles.colors),
      fontSizes: Array.from(styles.fontSizes).sort((a, b) => a - b),
      uniqueStyles: styles.uniqueStyles
    };
  }

  /**
   * Extract layout information
   */
  extractLayout(elements, canvas) {
    return {
      bounds: this.calculateBounds(elements),
      layers: this.analyzeLayers(elements)
    };
  }

  /**
   * Calculate overall content bounds
   */
  calculateBounds(elements) {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(element => {
      const { position, size } = element;
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + size.width);
      maxY = Math.max(maxY, position.y + size.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Analyze layer structure
   */
  analyzeLayers(elements) {
    return elements
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((element, index) => ({
        elementId: element.id,
        zIndex: element.zIndex,
        layerOrder: index,
        isBackground: index === 0,
        isForeground: index === elements.length - 1
      }));
  }

  /**
   * Generate statistics about the parsed project
   */
  generateStatistics(elements) {
    const stats = {
      totalElements: elements.length,
      elementTypes: {},
      averageSize: { width: 0, height: 0 },
      totalArea: 0
    };

    let totalWidth = 0, totalHeight = 0, totalArea = 0;

    elements.forEach(element => {
      stats.elementTypes[element.type] = (stats.elementTypes[element.type] || 0) + 1;
      totalWidth += element.size.width;
      totalHeight += element.size.height;
      totalArea += element.size.width * element.size.height;
    });

    if (elements.length > 0) {
      stats.averageSize.width = Math.round(totalWidth / elements.length);
      stats.averageSize.height = Math.round(totalHeight / elements.length);
    }
    
    stats.totalArea = totalArea;
    return stats;
  }
}

// Create singleton instance
const tb365Parser = new TB365Parser();

module.exports = {
  tb365Parser,
  TB365Parser
};