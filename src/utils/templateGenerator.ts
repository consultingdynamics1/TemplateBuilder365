import type { TemplateElement, TemplateData } from '../types';

interface NunjucksGeneratorOptions {
  includeLayout?: boolean;
  cssMode?: 'inline' | 'classes' | 'external';
  includeComments?: boolean;
}

export class TemplateGenerator {
  private options: NunjucksGeneratorOptions;

  constructor(options: NunjucksGeneratorOptions = {}) {
    this.options = {
      includeLayout: true,
      cssMode: 'inline',
      includeComments: true,
      ...options,
    };
  }

  generateTemplate(templateData: TemplateData): string {
    const { elements, canvasSize, name } = templateData;
    
    const sortedElements = elements.sort((a, b) => a.zIndex - b.zIndex);
    
    let html = '';
    let css = '';

    if (this.options.includeComments) {
      html += `<!-- Generated template: ${name} -->\n`;
      html += `<!-- Canvas size: ${canvasSize.width}x${canvasSize.height} -->\n\n`;
    }

    if (this.options.includeLayout) {
      html += this.generateDocumentStart();
    }

    // Container div with canvas dimensions
    html += `<div class="template-container" style="width: ${canvasSize.width}px; height: ${canvasSize.height}px; position: relative; margin: 0 auto;">\n`;

    // Generate elements
    for (const element of sortedElements) {
      if (element.visible) {
        const { elementHtml, elementCss } = this.generateElement(element);
        html += `  ${elementHtml}\n`;
        if (elementCss) {
          css += elementCss + '\n';
        }
      }
    }

    html += '</div>\n';

    if (this.options.includeLayout) {
      if (this.options.cssMode === 'external' && css) {
        html = this.generateDocumentEnd(css) + html;
      } else {
        html += this.generateDocumentEnd(css);
      }
    }

    return html.trim();
  }

  private generateElement(element: TemplateElement): { elementHtml: string; elementCss: string } {
    const baseStyle = this.generateBaseStyle(element);
    let elementHtml = '';
    let elementCss = '';

    const elementId = `element-${element.id.slice(0, 8)}`;

    switch (element.type) {
      case 'text':
        const textStyle = this.generateTextStyle(element);
        const fullTextStyle = `${baseStyle} ${textStyle}`.trim();
        
        elementHtml = this.options.cssMode === 'inline' 
          ? `<div style="${fullTextStyle}">${this.escapeHtml(element.content)}</div>`
          : `<div class="${elementId}">${this.escapeHtml(element.content)}</div>`;
        
        if (this.options.cssMode === 'classes') {
          elementCss = `.${elementId} { ${fullTextStyle} }`;
        }
        break;

      case 'rectangle':
        const rectStyle = this.generateRectangleStyle(element);
        const fullRectStyle = `${baseStyle} ${rectStyle}`.trim();
        
        elementHtml = this.options.cssMode === 'inline'
          ? `<div style="${fullRectStyle}"></div>`
          : `<div class="${elementId}"></div>`;
        
        if (this.options.cssMode === 'classes') {
          elementCss = `.${elementId} { ${fullRectStyle} }`;
        }
        break;

      case 'image':
        const imgStyle = this.generateImageStyle(element);
        const fullImgStyle = `${baseStyle} ${imgStyle}`.trim();
        
        const imgSrc = element.src || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
        
        elementHtml = this.options.cssMode === 'inline'
          ? `<img src="${imgSrc}" alt="${element.name}" style="${fullImgStyle}" />`
          : `<img src="${imgSrc}" alt="${element.name}" class="${elementId}" />`;
        
        if (this.options.cssMode === 'classes') {
          elementCss = `.${elementId} { ${fullImgStyle} }`;
        }
        break;
    }

    return { elementHtml, elementCss };
  }

  private generateBaseStyle(element: TemplateElement): string {
    const styles = [
      'position: absolute',
      `left: ${element.position.x}px`,
      `top: ${element.position.y}px`,
      `width: ${element.size.width}px`,
      `height: ${element.size.height}px`,
      `z-index: ${element.zIndex}`,
    ];

    if (!element.visible) {
      styles.push('display: none');
    }

    return styles.join('; ');
  }

  private generateTextStyle(element: TemplateElement): string {
    if (element.type !== 'text') return '';

    const styles = [
      `font-family: ${element.fontFamily}`,
      `font-size: ${element.fontSize}px`,
      `font-weight: ${element.fontWeight}`,
      `color: ${element.color}`,
      `text-align: ${element.textAlign}`,
      'display: flex',
      'align-items: center',
      'box-sizing: border-box',
    ];

    if (element.fontStyle === 'italic') {
      styles.push('font-style: italic');
    }

    if (element.padding) {
      styles.push(`padding: ${element.padding}px`);
    }

    if (element.backgroundColor) {
      styles.push(`background-color: ${element.backgroundColor}`);
    }

    return styles.join('; ');
  }

  private generateRectangleStyle(element: TemplateElement): string {
    if (element.type !== 'rectangle') return '';

    const styles = [
      `background-color: ${element.fill}`,
      'box-sizing: border-box',
    ];

    if (element.stroke && element.strokeWidth > 0) {
      styles.push(`border: ${element.strokeWidth}px solid ${element.stroke}`);
    }

    if (element.cornerRadius > 0) {
      styles.push(`border-radius: ${element.cornerRadius}px`);
    }

    return styles.join('; ');
  }

  private generateImageStyle(element: TemplateElement): string {
    if (element.type !== 'image') return '';

    const styles = [
      'display: block',
      'box-sizing: border-box',
    ];

    if (element.opacity < 1) {
      styles.push(`opacity: ${element.opacity}`);
    }

    switch (element.fit) {
      case 'contain':
        styles.push('object-fit: contain');
        break;
      case 'cover':
        styles.push('object-fit: cover');
        break;
      case 'fill':
        styles.push('object-fit: fill');
        break;
      case 'stretch':
        styles.push('object-fit: fill');
        break;
    }

    return styles.join('; ');
  }

  private generateDocumentStart(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Template</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">

`;
  }

  private generateDocumentEnd(css?: string): string {
    let end = '\n</body>\n</html>';
    
    if (css && this.options.cssMode === 'classes') {
      const styleBlock = `
<style>
${css}
</style>`;
      end = styleBlock + end;
    }

    return end;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Generate Nunjucks template with data placeholders
  generateNunjucksTemplate(templateData: TemplateData): string {
    const { elements, canvasSize, name, variables } = templateData;
    
    let html = '';
    
    if (this.options.includeComments) {
      html += `{# Generated Nunjucks template: ${name} #}\n`;
      html += `{# Variables: ${Object.keys(variables).join(', ')} #}\n\n`;
    }

    html += `<div class="template-container" style="width: ${canvasSize.width}px; height: ${canvasSize.height}px; position: relative; margin: 0 auto;">\n`;

    const sortedElements = elements.sort((a, b) => a.zIndex - b.zIndex);

    for (const element of sortedElements) {
      if (element.visible) {
        html += `  ${this.generateNunjucksElement(element, variables)}\n`;
      }
    }

    html += '</div>\n';

    return html.trim();
  }

  private generateNunjucksElement(element: TemplateElement, variables: Record<string, any>): string {
    const baseStyle = this.generateBaseStyle(element);

    switch (element.type) {
      case 'text':
        const textStyle = this.generateTextStyle(element);
        const content = this.replaceVariables(element.content, variables);
        return `<div style="${baseStyle} ${textStyle}">${content}</div>`;

      case 'rectangle':
        const rectStyle = this.generateRectangleStyle(element);
        return `<div style="${baseStyle} ${rectStyle}"></div>`;

      case 'image':
        const imgStyle = this.generateImageStyle(element);
        const imgSrc = this.replaceVariables(element.src || '', variables);
        return `<img src="${imgSrc}" alt="${element.name}" style="${baseStyle} ${imgStyle}" />`;

      default:
        return '';
    }
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables.hasOwnProperty(varName) ? `{{ ${varName} }}` : match;
    });
  }
}

// Default instance for easy usage
export const templateGenerator = new TemplateGenerator();