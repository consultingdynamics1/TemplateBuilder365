const { cssGenerator } = require('./css-generator');
const { dataExtractor } = require('./data-extractor');

/**
 * Project Generator Service
 * Converts parsed TB365 data to APITemplate.io format
 */

class ProjectGenerator {
  /**
   * Generate APITemplate.io project structure
   * @param {Object} parsedData - Parsed TB365 data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} APITemplate.io project
   */
  async generate(parsedData, options = {}) {
    try {
      console.log(`Generating APITemplate.io project for: ${parsedData.projectName}`);
      
      // Extract generation options
      const {
        outputFormat = 'json',
        includeAssets = false,
        generatePreview = false,
        customSettings = {}
      } = options;
      
      // Generate HTML structure
      const htmlStructure = this.generateHtmlStructure(parsedData);
      
      // Generate CSS styles
      const cssStyles = await cssGenerator.generate(parsedData, customSettings);
      
      // Extract data variables (enhanced with content analysis)
      const dataVariables = this.extractEnhancedVariables(parsedData);
      
      // Create APITemplate.io project structure
      const apiTemplateProject = {
        name: parsedData.projectName,
        version: '1.0.0',
        created: new Date().toISOString(),
        source: {
          format: 'tb365',
          version: parsedData.version,
          convertedAt: new Date().toISOString()
        },
        template: {
          format: 'html',
          width: parsedData.canvas.size.width,
          height: parsedData.canvas.size.height,
          html: htmlStructure.html,
          css: cssStyles.css,
          objects: htmlStructure.objects,
          settings: {
            zoom: parsedData.canvas.zoom,
            grid: {
              enabled: parsedData.canvas.snapToGrid,
              size: parsedData.canvas.gridSize
            },
            ...customSettings
          }
        },
        data: {
          variables: dataVariables.variables,
          defaultValues: dataVariables.defaultValues,
          schema: dataVariables.schema
        },
        metadata: {
          originalElements: parsedData.statistics.totalElements,
          generatedObjects: Object.keys(htmlStructure.objects).length,
          hasImages: parsedData.elements.some(el => el.type === 'image'),
          hasTables: parsedData.elements.some(el => el.type === 'table'),
          complexity: this.calculateComplexity(parsedData)
        }
      };
      
      // Add preview if requested
      if (generatePreview) {
        apiTemplateProject.preview = await this.generatePreview(apiTemplateProject);
      }
      
      console.log(`Successfully generated APITemplate.io project with ${Object.keys(htmlStructure.objects).length} objects`);
      
      return apiTemplateProject;
    } catch (error) {
      console.error('Error generating APITemplate.io project:', error);
      throw new Error(`Project generation failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML structure from parsed elements
   * @param {Object} parsedData - Parsed TB365 data
   * @returns {Object} HTML structure with objects
   */
  generateHtmlStructure(parsedData) {
    const { elements, canvas } = parsedData;
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${parsedData.projectName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            width: ${canvas.size.width}px;
            height: ${canvas.size.height}px;
            position: relative;
            font-family: Arial, sans-serif;
        }
        .canvas-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div class="canvas-container">
`;

    const objects = {};
    
    // Sort elements by z-index for proper rendering order
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    
    sortedElements.forEach(element => {
      const elementHtml = this.generateElementHtml(element);
      html += elementHtml.html;
      
      // Add to objects for APITemplate.io
      objects[element.id] = {
        name: element.name,
        type: this.mapElementType(element.type),
        position: {
          x: element.position.x,
          y: element.position.y
        },
        size: {
          width: element.size.width,
          height: element.size.height
        },
        properties: elementHtml.properties,
        zIndex: element.zIndex,
        visible: element.visible,
        locked: element.locked
      };
    });

    html += `    </div>
</body>
</html>`;

    return {
      html,
      objects
    };
  }

  /**
   * Generate HTML for individual element
   * @param {Object} element - Element to convert
   * @returns {Object} Element HTML and properties
   */
  generateElementHtml(element) {
    const baseStyle = `
      position: absolute;
      left: ${element.position.x}px;
      top: ${element.position.y}px;
      width: ${element.size.width}px;
      height: ${element.size.height}px;
      z-index: ${element.zIndex};
      ${!element.visible ? 'display: none;' : ''}
    `;

    switch (element.type) {
      case 'text':
        return this.generateTextElement(element, baseStyle);
      case 'rectangle':
        return this.generateRectangleElement(element, baseStyle);
      case 'image':
        return this.generateImageElement(element, baseStyle);
      case 'table':
        return this.generateTableElement(element, baseStyle);
      default:
        return this.generateGenericElement(element, baseStyle);
    }
  }

  /**
   * Generate text element HTML with enhanced content processing
   */
  generateTextElement(element, baseStyle) {
    const { styling } = element;
    const additionalStyle = `
      font-size: ${styling.fontSize}px;
      font-family: '${styling.fontFamily}';
      font-weight: ${styling.fontWeight};
      font-style: ${styling.fontStyle};
      text-align: ${styling.textAlign};
      color: ${styling.color};
      ${styling.backgroundColor ? `background-color: ${styling.backgroundColor};` : ''}
      padding: ${styling.padding}px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
    `;

    // Process content based on type (template variables vs raw content)
    const processedContent = this.processElementContent(element);

    const html = `
        <div id="${element.id}" class="text-element ${element.name}" style="${baseStyle}${additionalStyle}">
            ${processedContent.html}
        </div>`;

    return {
      html,
      properties: {
        originalContent: element.content,
        contentType: processedContent.type,
        processedContent: processedContent.html,
        hasVariables: processedContent.hasVariables,
        variables: processedContent.variables,
        fontSize: styling.fontSize,
        fontFamily: styling.fontFamily,
        fontWeight: styling.fontWeight,
        fontStyle: styling.fontStyle,
        textAlign: styling.textAlign,
        color: styling.color,
        backgroundColor: styling.backgroundColor,
        padding: styling.padding
      }
    };
  }

  /**
   * Generate rectangle element HTML
   */
  generateRectangleElement(element, baseStyle) {
    const { styling } = element;
    const additionalStyle = `
      background-color: ${styling.fill};
      border: ${styling.strokeWidth}px solid ${styling.stroke};
      border-radius: ${styling.cornerRadius}px;
      box-sizing: border-box;
    `;

    const html = `
        <div id="${element.id}" class="rectangle-element ${element.name}" style="${baseStyle}${additionalStyle}">
        </div>`;

    return {
      html,
      properties: {
        fill: styling.fill,
        stroke: styling.stroke,
        strokeWidth: styling.strokeWidth,
        cornerRadius: styling.cornerRadius
      }
    };
  }

  /**
   * Generate image element HTML
   */
  generateImageElement(element, baseStyle) {
    const { styling } = element;
    const additionalStyle = `
      opacity: ${styling.opacity};
      object-fit: ${this.mapImageFit(styling.fit)};
    `;

    const html = `
        <img id="${element.id}" class="image-element ${element.name}" 
             src="{{${element.name}_url}}" 
             alt="${element.name}"
             style="${baseStyle}${additionalStyle}">`;

    return {
      html,
      properties: {
        src: element.src,
        opacity: styling.opacity,
        fit: styling.fit,
        variable: `${element.name}_url`
      }
    };
  }

  /**
   * Generate table element HTML
   */
  generateTableElement(element, baseStyle) {
    const { table, styling } = element;
    const cellWidth = element.size.width / table.columns;
    const cellHeight = element.size.height / table.rows;
    
    const additionalStyle = `
      border: ${styling.borderWidth}px solid ${styling.borderColor};
      border-collapse: collapse;
      font-family: '${styling.fontFamily}';
      font-size: ${styling.fontSize}px;
      color: ${styling.textColor};
    `;

    let tableHtml = `
        <table id="${element.id}" class="table-element ${element.name}" style="${baseStyle}${additionalStyle}">`;

    table.cells.forEach((row, rowIndex) => {
      tableHtml += '\n            <tr>';
      row.forEach((cell, colIndex) => {
        const cellStyle = `
          width: ${cellWidth}px;
          height: ${cellHeight}px;
          padding: ${styling.cellPadding}px;
          border: ${styling.borderWidth}px solid ${styling.borderColor};
          background-color: ${cell.isHeader ? styling.headerBackground : styling.cellBackground};
          vertical-align: top;
        `;
        
        const tagName = cell.isHeader ? 'th' : 'td';
        tableHtml += `
                <${tagName} style="${cellStyle}">{{${element.name}_${rowIndex}_${colIndex}}}</${tagName}>`;
      });
      tableHtml += '\n            </tr>';
    });

    tableHtml += '\n        </table>';

    // Generate properties with cell variables
    const properties = {
      rows: table.rows,
      columns: table.columns,
      cells: table.cells,
      cellPadding: styling.cellPadding,
      borderWidth: styling.borderWidth,
      borderColor: styling.borderColor,
      headerBackground: styling.headerBackground,
      cellBackground: styling.cellBackground,
      textColor: styling.textColor,
      fontSize: styling.fontSize,
      fontFamily: styling.fontFamily,
      variables: {}
    };

    // Add cell variables
    table.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const variableName = `${element.name}_${rowIndex}_${colIndex}`;
        properties.variables[variableName] = cell.content;
      });
    });

    return {
      html: tableHtml,
      properties
    };
  }

  /**
   * Generate generic element HTML
   */
  generateGenericElement(element, baseStyle) {
    const html = `
        <div id="${element.id}" class="element ${element.name}" style="${baseStyle}">
        </div>`;

    return {
      html,
      properties: {}
    };
  }

  /**
   * Map TB365 element types to APITemplate.io types
   */
  mapElementType(tb365Type) {
    const typeMap = {
      'text': 'text',
      'rectangle': 'shape',
      'image': 'image',
      'table': 'table'
    };
    return typeMap[tb365Type] || 'element';
  }

  /**
   * Map TB365 image fit to CSS object-fit
   */
  mapImageFit(tb365Fit) {
    const fitMap = {
      'fill': 'fill',
      'contain': 'contain',
      'cover': 'cover',
      'stretch': 'fill'
    };
    return fitMap[tb365Fit] || 'contain';
  }

  /**
   * Calculate project complexity score
   */
  calculateComplexity(parsedData) {
    let score = 0;
    
    // Base score from element count
    score += parsedData.statistics.totalElements * 1;
    
    // Add points for different element types
    Object.entries(parsedData.statistics.elementTypes).forEach(([type, count]) => {
      const typeMultipliers = {
        'text': 1,
        'rectangle': 0.5,
        'image': 2,
        'table': 3
      };
      score += count * (typeMultipliers[type] || 1);
    });
    
    // Add points for styling complexity
    score += parsedData.styles.uniqueStyles.length * 0.5;
    
    // Add points for variables
    score += parsedData.textContent.variables.length * 1;
    
    // Classify complexity
    if (score < 10) return 'simple';
    if (score < 25) return 'moderate';
    if (score < 50) return 'complex';
    return 'very-complex';
  }

  /**
   * Extract enhanced variables with content analysis
   * @param {Object} parsedData - Parsed TB365 data
   * @returns {Object} Enhanced variable data
   */
  extractEnhancedVariables(parsedData) {
    // Use the content analysis from TB365 parser
    const contentAnalysis = parsedData.textContent.contentAnalysis;
    
    return {
      variables: contentAnalysis.dataStructure.variables,
      defaultValues: contentAnalysis.dataStructure.defaultValues,
      schema: contentAnalysis.dataStructure.schema,
      categories: contentAnalysis.dataStructure.categories,
      sampleData: contentAnalysis.sampleData,
      statistics: contentAnalysis.statistics
    };
  }

  /**
   * Process element content based on type (template vs raw)
   * @param {Object} element - Element to process
   * @returns {Object} Processed content structure
   */
  processElementContent(element) {
    const { contentProcessor } = require('./content-processor');
    const analysis = contentProcessor.analyzeContent(element.content);
    
    let html;
    
    switch (analysis.type) {
      case 'raw':
        // Pure raw content - use as-is
        html = this.escapeHtml(analysis.processedContent);
        break;
        
      case 'template':
        // Pure template variables - preserve for data binding
        html = analysis.processedContent; // Keep {{variable}} format
        break;
        
      case 'mixed':
        // Mixed content - process structure
        html = this.processMixedContent(analysis);
        break;
        
      case 'empty':
        html = '';
        break;
        
      default:
        html = this.escapeHtml(element.content);
    }
    
    return {
      type: analysis.type,
      html,
      hasVariables: analysis.hasVariables,
      variables: analysis.variables,
      structure: analysis.structure,
      rawParts: analysis.rawParts
    };
  }

  /**
   * Process mixed content (both raw text and variables)
   * @param {Object} analysis - Content analysis
   * @returns {string} Processed HTML
   */
  processMixedContent(analysis) {
    return analysis.structure.map(part => {
      if (part.type === 'text') {
        return this.escapeHtml(part.content);
      } else if (part.type === 'variable') {
        return part.content; // Keep {{variable}} format for data binding
      }
      return '';
    }).join('');
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\n/g, '<br>'); // Convert newlines to HTML breaks
  }

  /**
   * Generate preview of the template
   */
  async generatePreview(apiTemplateProject) {
    // This would typically generate a preview image or thumbnail
    // For now, return metadata about the preview
    return {
      available: false,
      reason: 'Preview generation not implemented',
      suggested: 'Use APITemplate.io preview API after template creation'
    };
  }
}

// Create singleton instance
const projectGenerator = new ProjectGenerator();

module.exports = {
  projectGenerator,
  ProjectGenerator
};