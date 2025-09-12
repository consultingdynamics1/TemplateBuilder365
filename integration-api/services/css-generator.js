/**
 * CSS Generator Service
 * Generates CSS styles for APITemplate.io templates
 */

class CSSGenerator {
  /**
   * Generate CSS from parsed TB365 data
   * @param {Object} parsedData - Parsed TB365 data
   * @param {Object} customSettings - Custom CSS generation settings
   * @returns {Promise<Object>} Generated CSS and metadata
   */
  async generate(parsedData, customSettings = {}) {
    try {
      console.log(`Generating CSS for ${parsedData.elements.length} elements`);
      
      const {
        minifyCSS = false,
        includeComments = true,
        generateUtilities = true,
        responsive = false
      } = customSettings;
      
      // Generate base CSS
      const baseCss = this.generateBaseCSS(parsedData.canvas);
      
      // Generate element-specific CSS
      const elementCss = this.generateElementCSS(parsedData.elements, includeComments);
      
      // Generate utility classes
      const utilityCss = generateUtilities ? this.generateUtilityCSS(parsedData.styles) : '';
      
      // Generate responsive CSS if requested
      const responsiveCss = responsive ? this.generateResponsiveCSS(parsedData) : '';
      
      // Combine all CSS
      let css = [baseCss, elementCss, utilityCss, responsiveCss]
        .filter(Boolean)
        .join('\n\n');
      
      // Minify if requested
      if (minifyCSS) {
        css = this.minifyCSS(css);
      }
      
      // Extract CSS statistics
      const stats = this.analyzeCSSStats(css);
      
      console.log(`Generated CSS with ${stats.totalRules} rules (${stats.sizeBytes} bytes)`);
      
      return {
        css,
        stats,
        settings: customSettings
      };
    } catch (error) {
      console.error('Error generating CSS:', error);
      throw new Error(`CSS generation failed: ${error.message}`);
    }
  }

  /**
   * Generate base CSS for the canvas
   */
  generateBaseCSS(canvas) {
    return `/* Base Canvas Styles */
body {
    margin: 0;
    padding: 0;
    width: ${canvas.size.width}px;
    height: ${canvas.size.height}px;
    position: relative;
    font-family: Arial, sans-serif;
    box-sizing: border-box;
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

/* Element base class */
.element {
    position: absolute;
    box-sizing: border-box;
}

/* Hidden elements */
.element.hidden {
    display: none !important;
}

/* Locked elements (visual indicator) */
.element.locked {
    pointer-events: none;
}`;
  }

  /**
   * Generate CSS for individual elements
   */
  generateElementCSS(elements, includeComments = true) {
    let css = includeComments ? '\n/* Element Styles */' : '';
    
    elements.forEach(element => {
      if (includeComments) {
        css += `\n\n/* ${element.name} (${element.type}) */`;
      }
      
      css += `\n#${element.id} {`;
      css += `\n    position: absolute;`;
      css += `\n    left: ${element.position.x}px;`;
      css += `\n    top: ${element.position.y}px;`;
      css += `\n    width: ${element.size.width}px;`;
      css += `\n    height: ${element.size.height}px;`;
      css += `\n    z-index: ${element.zIndex};`;
      
      if (!element.visible) {
        css += `\n    display: none;`;
      }
      
      // Add element-specific styles
      switch (element.type) {
        case 'text':
          css += this.generateTextCSS(element);
          break;
        case 'rectangle':
          css += this.generateRectangleCSS(element);
          break;
        case 'image':
          css += this.generateImageCSS(element);
          break;
        case 'table':
          css += this.generateTableCSS(element);
          break;
      }
      
      css += `\n}`;
      
      // Add hover effects for interactive elements
      if (element.type === 'text' || element.type === 'rectangle') {
        css += `\n\n#${element.id}:hover {`;
        css += `\n    opacity: 0.8;`;
        css += `\n    transition: opacity 0.2s ease;`;
        css += `\n}`;
      }
    });
    
    return css;
  }

  /**
   * Generate CSS specific to text elements
   */
  generateTextCSS(element) {
    const { styling } = element;
    let css = '';
    
    css += `\n    font-size: ${styling.fontSize}px;`;
    css += `\n    font-family: '${styling.fontFamily}';`;
    css += `\n    font-weight: ${styling.fontWeight};`;
    css += `\n    font-style: ${styling.fontStyle};`;
    css += `\n    text-align: ${styling.textAlign};`;
    css += `\n    color: ${styling.color};`;
    css += `\n    padding: ${styling.padding}px;`;
    css += `\n    display: flex;`;
    css += `\n    align-items: center;`;
    css += `\n    word-wrap: break-word;`;
    css += `\n    overflow-wrap: break-word;`;
    
    if (styling.backgroundColor) {
      css += `\n    background-color: ${styling.backgroundColor};`;
    }
    
    return css;
  }

  /**
   * Generate CSS specific to rectangle elements
   */
  generateRectangleCSS(element) {
    const { styling } = element;
    let css = '';
    
    css += `\n    background-color: ${styling.fill};`;
    css += `\n    border: ${styling.strokeWidth}px solid ${styling.stroke};`;
    
    if (styling.cornerRadius > 0) {
      css += `\n    border-radius: ${styling.cornerRadius}px;`;
    }
    
    return css;
  }

  /**
   * Generate CSS specific to image elements
   */
  generateImageCSS(element) {
    const { styling } = element;
    let css = '';
    
    css += `\n    opacity: ${styling.opacity};`;
    css += `\n    object-fit: ${this.mapImageFit(styling.fit)};`;
    css += `\n    object-position: center;`;
    css += `\n    display: block;`;
    
    return css;
  }

  /**
   * Generate CSS specific to table elements
   */
  generateTableCSS(element) {
    const { styling } = element;
    let css = '';
    
    css += `\n    border-collapse: collapse;`;
    css += `\n    font-family: '${styling.fontFamily}';`;
    css += `\n    font-size: ${styling.fontSize}px;`;
    css += `\n    color: ${styling.textColor};`;
    css += `\n    border: ${styling.borderWidth}px solid ${styling.borderColor};`;
    
    // Add styles for table cells
    css += `\n}\n\n#${element.id} td, #${element.id} th {`;
    css += `\n    padding: ${styling.cellPadding}px;`;
    css += `\n    border: ${styling.borderWidth}px solid ${styling.borderColor};`;
    css += `\n    vertical-align: top;`;
    css += `\n    text-align: left;`;
    css += `\n}`;
    
    css += `\n\n#${element.id} th {`;
    css += `\n    background-color: ${styling.headerBackground};`;
    css += `\n    font-weight: bold;`;
    css += `\n}`;
    
    css += `\n\n#${element.id} td {`;
    css += `\n    background-color: ${styling.cellBackground};`;
    
    return css;
  }

  /**
   * Generate utility CSS classes
   */
  generateUtilityCSS(styles) {
    let css = '\n/* Utility Classes */';
    
    // Color utilities
    css += '\n\n/* Color Classes */';
    styles.colors.forEach(color => {
      const className = this.colorToClassName(color);
      css += `\n.text-${className} { color: ${color}; }`;
      css += `\n.bg-${className} { background-color: ${color}; }`;
      css += `\n.border-${className} { border-color: ${color}; }`;
    });
    
    // Font size utilities
    css += '\n\n/* Font Size Classes */';
    styles.fontSizes.forEach(size => {
      css += `\n.text-${size} { font-size: ${size}px; }`;
    });
    
    // Font family utilities
    css += '\n\n/* Font Family Classes */';
    styles.fonts.forEach(font => {
      const className = this.fontToClassName(font);
      css += `\n.font-${className} { font-family: '${font}'; }`;
    });
    
    // Common utilities
    css += '\n\n/* Common Utilities */';
    css += '\n.text-left { text-align: left; }';
    css += '\n.text-center { text-align: center; }';
    css += '\n.text-right { text-align: right; }';
    css += '\n.font-bold { font-weight: bold; }';
    css += '\n.font-italic { font-style: italic; }';
    css += '\n.hidden { display: none !important; }';
    css += '\n.visible { display: block !important; }';
    css += '\n.opacity-50 { opacity: 0.5; }';
    css += '\n.opacity-75 { opacity: 0.75; }';
    
    return css;
  }

  /**
   * Generate responsive CSS
   */
  generateResponsiveCSS(parsedData) {
    const canvas = parsedData.canvas;
    
    let css = '\n/* Responsive Styles */';
    
    // Tablet breakpoint
    css += '\n\n@media (max-width: 1024px) {';
    css += '\n    body {';
    css += '\n        width: 100%;';
    css += '\n        height: auto;';
    css += '\n        min-height: 100vh;';
    css += '\n    }';
    css += '\n    .canvas-container {';
    css += '\n        width: 100%;';
    css += '\n        height: auto;';
    css += '\n        min-height: 100vh;';
    css += '\n    }';
    css += '\n}';
    
    // Mobile breakpoint
    css += '\n\n@media (max-width: 768px) {';
    css += '\n    .element {';
    css += '\n        position: static !important;';
    css += '\n        width: 100% !important;';
    css += '\n        height: auto !important;';
    css += '\n        margin-bottom: 1rem;';
    css += '\n    }';
    css += '\n    .text-element {';
    css += '\n        font-size: 16px !important;';
    css += '\n        padding: 1rem !important;';
    css += '\n    }';
    css += '\n}';
    
    return css;
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
   * Convert color hex to CSS class name
   */
  colorToClassName(color) {
    return color.replace('#', '').toLowerCase();
  }

  /**
   * Convert font name to CSS class name
   */
  fontToClassName(font) {
    return font.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Basic CSS minification
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*{\s*/g, '{') // Remove spaces around braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
      .replace(/\s*:\s*/g, ':') // Remove spaces around colons
      .replace(/\s*,\s*/g, ',') // Remove spaces around commas
      .trim();
  }

  /**
   * Analyze CSS statistics
   */
  analyzeCSSStats(css) {
    const lines = css.split('\n');
    const rules = css.match(/[^{}]+{[^{}]*}/g) || [];
    const properties = css.match(/[^{}:]+:[^{}:;]+;/g) || [];
    const comments = css.match(/\/\*[\s\S]*?\*\//g) || [];
    
    return {
      totalLines: lines.length,
      totalRules: rules.length,
      totalProperties: properties.length,
      totalComments: comments.length,
      sizeBytes: Buffer.byteLength(css, 'utf8'),
      sizeKB: Math.round(Buffer.byteLength(css, 'utf8') / 1024 * 100) / 100
    };
  }
}

// Create singleton instance
const cssGenerator = new CSSGenerator();

module.exports = {
  cssGenerator,
  CSSGenerator
};