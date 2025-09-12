/**
 * HTML Generator Service
 * Converts parsed TB365 data to complete self-contained HTML documents
 */

class HtmlGenerator {
  /**
   * Generate complete HTML document with embedded CSS
   * @param {Object} parsedData - Parsed TB365 data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Complete HTML with data and metadata
   */
  async generate(parsedData, options = {}) {
    try {
      console.log(`Generating complete HTML for: ${parsedData.projectName}`);
      
      const startTime = Date.now();
      
      // Generate CSS styles
      const cssStyles = this.generateCSS(parsedData);
      
      // Generate HTML structure
      const htmlContent = this.generateHTML(parsedData, cssStyles);
      
      // Extract and process variables
      const dataStructure = this.extractDataStructure(parsedData);
      
      // Create complete result
      const result = {
        html: htmlContent,
        data: dataStructure,
        metadata: {
          projectName: parsedData.projectName,
          version: parsedData.version,
          originalElements: parsedData.elements.length,
          variables: Object.keys(dataStructure.variables).length,
          canvasSize: parsedData.canvas.size,
          complexity: this.calculateComplexity(parsedData),
          generatedAt: new Date().toISOString(),
          generationTime: Date.now() - startTime + 'ms'
        }
      };
      
      console.log(`HTML generated in ${result.metadata.generationTime}`);
      return result;
      
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw new Error(`HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Generate complete HTML document with embedded CSS
   * @param {Object} parsedData - Parsed TB365 data
   * @param {string} cssStyles - Generated CSS styles
   * @returns {string} Complete HTML document
   */
  generateHTML(parsedData, cssStyles) {
    const { elements, canvas } = parsedData;
    
    // Start building HTML document
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(parsedData.projectName)}</title>
    <style>
${cssStyles}
    </style>
</head>
<body>
    <div class="canvas-container">
`;

    // Sort elements by z-index for proper rendering order
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    
    // Generate HTML for each element
    sortedElements.forEach(element => {
      html += this.generateElementHTML(element);
    });

    html += `    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate CSS for all elements
   * @param {Object} parsedData - Parsed TB365 data
   * @returns {string} Complete CSS styles
   */
  generateCSS(parsedData) {
    const { elements, canvas } = parsedData;
    
    let css = `/* Base Canvas Styles */
body {
    margin: 0;
    padding: 0;
    width: ${canvas.size.width}px;
    height: ${canvas.size.height}px;
    position: relative;
    font-family: Arial, sans-serif;
    box-sizing: border-box;
    background-color: #ffffff;
}

*, *::before, *::after {
    box-sizing: inherit;
}

.canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

/* Element Base Classes */
.element {
    position: absolute;
    box-sizing: border-box;
}

.element.hidden {
    display: none !important;
}

.element.locked {
    pointer-events: none;
    opacity: 0.7;
}

`;

    // Generate element-specific CSS
    elements.forEach(element => {
      css += this.generateElementCSS(element);
    });

    // Add utility classes
    css += this.generateUtilityClasses(elements);

    return css;
  }

  /**
   * Generate HTML for individual element
   * @param {Object} element - Element to convert
   * @returns {string} Element HTML
   */
  generateElementHTML(element) {
    const baseClasses = `element ${element.type}-element ${element.name}`;
    const visibilityClass = !element.visible ? ' hidden' : '';
    const lockedClass = element.locked ? ' locked' : '';
    
    const classes = `${baseClasses}${visibilityClass}${lockedClass}`;

    switch (element.type) {
      case 'text':
        return this.generateTextHTML(element, classes);
      case 'rectangle':
        return this.generateRectangleHTML(element, classes);
      case 'image':
        return this.generateImageHTML(element, classes);
      case 'table':
        return this.generateTableHTML(element, classes);
      default:
        return this.generateGenericHTML(element, classes);
    }
  }

  /**
   * Generate text element HTML
   */
  generateTextHTML(element, classes) {
    const { contentProcessor } = require('./content-processor');
    const analysis = contentProcessor.analyzeContent(element.content);
    
    // Process content - keep variables as-is for replacement
    let content = element.content;
    if (analysis.type === 'raw') {
      content = this.escapeHtml(content);
    }
    // For template and mixed content, preserve variable syntax
    
    return `        <div id="${element.id}" class="${classes}">
            ${content}
        </div>
`;
  }

  /**
   * Generate rectangle element HTML
   */
  generateRectangleHTML(element, classes) {
    return `        <div id="${element.id}" class="${classes}">
        </div>
`;
  }

  /**
   * Generate image element HTML
   */
  generateImageHTML(element, classes) {
    // Use variable syntax for image src that can be replaced later
    const imageSrc = element.src || `{{${element.name}_url}}`;
    
    return `        <img id="${element.id}" class="${classes}" 
             src="${imageSrc}" 
             alt="${this.escapeHtml(element.name)}"
             loading="lazy">
`;
  }

  /**
   * Generate table element HTML
   */
  generateTableHTML(element, classes) {
    if (!element.table) {
      return `        <div id="${element.id}" class="${classes}">Table data missing</div>\n`;
    }

    let tableHTML = `        <table id="${element.id}" class="${classes}">
`;

    element.table.cells.forEach((row, rowIndex) => {
      tableHTML += '            <tr>\n';
      row.forEach((cell, colIndex) => {
        const tagName = cell.isHeader ? 'th' : 'td';
        // Preserve template variables in table cells
        const content = cell.content || '';
        
        tableHTML += `                <${tagName}>${content}</${tagName}>\n`;
      });
      tableHTML += '            </tr>\n';
    });

    tableHTML += '        </table>\n';
    return tableHTML;
  }

  /**
   * Generate generic element HTML
   */
  generateGenericHTML(element, classes) {
    return `        <div id="${element.id}" class="${classes}">
        </div>
`;
  }

  /**
   * Generate CSS for individual element
   * @param {Object} element - Element to style
   * @returns {string} Element CSS
   */
  generateElementCSS(element) {
    const baseStyle = `
#${element.id} {
    position: absolute;
    left: ${element.position.x}px;
    top: ${element.position.y}px;
    width: ${element.size.width}px;
    height: ${element.size.height}px;
    z-index: ${element.zIndex};`;

    switch (element.type) {
      case 'text':
        return this.generateTextCSS(element, baseStyle);
      case 'rectangle':
        return this.generateRectangleCSS(element, baseStyle);
      case 'image':
        return this.generateImageCSS(element, baseStyle);
      case 'table':
        return this.generateTableCSS(element, baseStyle);
      default:
        return `${baseStyle}
}

`;
    }
  }

  /**
   * Generate CSS for text element
   */
  generateTextCSS(element, baseStyle) {
    const styling = element.styling;
    return `${baseStyle}
    font-size: ${styling.fontSize}px;
    font-family: '${styling.fontFamily}';
    font-weight: ${styling.fontWeight};
    font-style: ${styling.fontStyle};
    text-align: ${styling.textAlign};
    color: ${styling.color};
    ${styling.backgroundColor !== 'transparent' ? `background-color: ${styling.backgroundColor};` : ''}
    padding: ${styling.padding}px;
    display: flex;
    align-items: center;
    justify-content: ${this.mapTextAlign(styling.textAlign)};
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.2;
}

#${element.id}:hover {
    opacity: 0.9;
    transition: opacity 0.2s ease;
}

`;
  }

  /**
   * Generate CSS for rectangle element
   */
  generateRectangleCSS(element, baseStyle) {
    const styling = element.styling;
    return `${baseStyle}
    background-color: ${styling.fill};
    border: ${styling.strokeWidth}px solid ${styling.stroke};
    border-radius: ${styling.cornerRadius}px;
}

#${element.id}:hover {
    opacity: 0.8;
    transition: opacity 0.2s ease;
}

`;
  }

  /**
   * Generate CSS for image element
   */
  generateImageCSS(element, baseStyle) {
    const styling = element.styling;
    return `${baseStyle}
    object-fit: ${this.mapImageFit(styling.fit)};
    opacity: ${styling.opacity || 1};
    border-radius: 4px;
}

#${element.id}:hover {
    transform: scale(1.02);
    transition: transform 0.2s ease;
}

`;
  }

  /**
   * Generate CSS for table element
   */
  generateTableCSS(element, baseStyle) {
    const styling = element.styling;
    return `${baseStyle}
    border-collapse: collapse;
    font-family: '${styling.fontFamily}';
    font-size: ${styling.fontSize}px;
    color: ${styling.textColor};
}

#${element.id} th,
#${element.id} td {
    padding: ${styling.cellPadding}px;
    border: ${styling.borderWidth}px solid ${styling.borderColor};
    text-align: left;
    vertical-align: top;
}

#${element.id} th {
    background-color: ${styling.headerBackground};
    font-weight: bold;
}

#${element.id} td {
    background-color: ${styling.cellBackground};
}

`;
  }

  /**
   * Generate utility CSS classes
   */
  generateUtilityClasses(elements) {
    const colors = new Set();
    const fontSizes = new Set();
    const fontFamilies = new Set();

    // Collect unique values for utility classes
    elements.forEach(element => {
      if (element.styling) {
        if (element.styling.color) colors.add(element.styling.color);
        if (element.styling.fill) colors.add(element.styling.fill);
        if (element.styling.stroke) colors.add(element.styling.stroke);
        if (element.styling.fontSize) fontSizes.add(element.styling.fontSize);
        if (element.styling.fontFamily) fontFamilies.add(element.styling.fontFamily);
      }
    });

    let utilities = `
/* Utility Classes */

/* Visibility */
.hidden { display: none !important; }
.visible { display: block !important; }

/* Text Alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* Font Weights */
.font-normal { font-weight: normal; }
.font-bold { font-weight: bold; }

/* Font Styles */
.font-italic { font-style: italic; }

/* Opacity */
.opacity-50 { opacity: 0.5; }
.opacity-75 { opacity: 0.75; }

`;

    // Generate color utilities
    colors.forEach(color => {
      const className = color.replace('#', 'color-');
      utilities += `.${className} { color: ${color}; }\n`;
      utilities += `.bg-${className} { background-color: ${color}; }\n`;
    });

    // Generate font size utilities
    fontSizes.forEach(size => {
      utilities += `.text-${size} { font-size: ${size}px; }\n`;
    });

    // Generate font family utilities
    fontFamilies.forEach(family => {
      const className = family.toLowerCase().replace(/\s+/g, '-');
      utilities += `.font-${className} { font-family: '${family}'; }\n`;
    });

    return utilities;
  }

  /**
   * Extract data structure for variables
   */
  extractDataStructure(parsedData) {
    const { contentProcessor } = require('./content-processor');
    const processed = contentProcessor.processContent(parsedData.elements);
    
    return contentProcessor.generateDataStructure(processed);
  }

  /**
   * Simple variable replacement in HTML
   * @param {string} html - HTML template with variables
   * @param {Object} data - Data object with variable values
   * @param {Object} defaultValues - Default values for missing variables
   * @returns {string} HTML with variables replaced
   */
  replaceVariables(html, data = {}, defaultValues = {}) {
    let result = html;
    
    // Find all variables in {{variable}} format
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = variableRegex.exec(html)) !== null) {
      const variableName = match[1].trim();
      const fullMatch = match[0];
      
      // Get value from data, falling back to default, then to variable name
      let value = this.getNestedValue(data, variableName) || 
                  defaultValues[variableName] || 
                  `[${variableName}]`;
      
      // Replace the variable
      result = result.replace(fullMatch, this.escapeHtml(String(value)));
    }
    
    return result;
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
   * Map text alignment to CSS justify-content
   */
  mapTextAlign(textAlign) {
    const alignMap = {
      'left': 'flex-start',
      'center': 'center', 
      'right': 'flex-end'
    };
    return alignMap[textAlign] || 'flex-start';
  }

  /**
   * Map image fit values
   */
  mapImageFit(fit) {
    const fitMap = {
      'fill': 'fill',
      'contain': 'contain',
      'cover': 'cover',
      'stretch': 'fill'
    };
    return fitMap[fit] || 'contain';
  }

  /**
   * Calculate project complexity
   */
  calculateComplexity(parsedData) {
    let score = parsedData.elements.length;
    
    // Add complexity for element types
    parsedData.elements.forEach(element => {
      switch (element.type) {
        case 'table': score += 3; break;
        case 'image': score += 2; break;
        case 'text': score += 1; break;
        default: score += 0.5;
      }
    });

    // Add complexity for variables
    const variableCount = parsedData.textContent?.variables?.length || 0;
    score += variableCount * 0.5;

    if (score < 5) return 'simple';
    if (score < 15) return 'moderate';
    if (score < 30) return 'complex';
    return 'very-complex';
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

// Create singleton instance
const htmlGenerator = new HtmlGenerator();

module.exports = {
  htmlGenerator,
  HtmlGenerator
};