/**
 * Shared TB365 Conversion Library
 * Used by both mock API server and AWS Lambda functions
 * Single source of truth for TB365 → HTML conversion
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Convert TB365 table cells array format to standard table data format
 */
function convertCellsToTableData(cells) {
  if (!cells || !Array.isArray(cells) || cells.length === 0) {
    return { headers: [], rows: [] };
  }

  // First row is headers if any cell has isHeader: true
  const firstRow = cells[0];
  const hasHeaders = firstRow && firstRow.some(cell => cell.isHeader);

  if (hasHeaders) {
    return {
      headers: firstRow.map(cell => cell.content || ''),
      rows: cells.slice(1).map(row => row.map(cell => cell.content || ''))
    };
  } else {
    return {
      headers: [],
      rows: cells.map(row => row.map(cell => cell.content || ''))
    };
  }
}

/**
 * Parse TB365 format into normalized structure
 * Properly extracts ALL element properties from actual frontend data
 */
function parseTB365(tb365Data) {
  const { canvasState } = tb365Data;
  const elements = [];
  const variables = [];

  // Process each element with full property extraction
  canvasState.elements.forEach((element, index) => {
    // Debug: Log first few elements to see what data we're getting
    if (index < 3) {
      console.log(`Element ${index}:`, JSON.stringify({
        id: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      }));
    }
    const normalized = {
      id: element.id || `element-${index}`,
      type: element.type,
      // Preserve exact positions including decimals - handle both flat and nested formats
      position: {
        x: element.position?.x != null ? element.position.x : (element.x != null ? element.x : 0),
        y: element.position?.y != null ? element.position.y : (element.y != null ? element.y : 0)
      },
      // Preserve exact sizes - handle both flat and nested formats
      size: {
        width: element.size?.width != null ? element.size.width : (element.width != null ? element.width : 100),
        height: element.size?.height != null ? element.size.height : (element.height != null ? element.height : 50)
      },
      // Extract all content variations
      content: element.content || element.text || '',
      // Layer ordering
      zIndex: element.zIndex || 0,
      // Image properties
      src: element.src || null,
      alt: element.alt || '',
      // Table data - handle both data object and cells array formats
      data: element.data || (element.cells ? convertCellsToTableData(element.cells) : null),
      // Complete style object with all possible properties
      style: {
        // Typography
        fontSize: element.fontSize || element.style?.fontSize || 16,
        fontFamily: element.fontFamily || element.style?.fontFamily || 'Arial',
        fontWeight: element.fontWeight || element.style?.fontWeight || 'normal',
        fontStyle: element.fontStyle || element.style?.fontStyle || 'normal',
        color: element.color || element.style?.color || '#000000',
        textAlign: element.textAlign || element.style?.textAlign || 'left',
        lineHeight: element.lineHeight || element.style?.lineHeight || 1.2,

        // Background and fill
        backgroundColor: element.backgroundColor || element.style?.backgroundColor || 'transparent',
        fill: element.fill || element.style?.fill || null,

        // Border and stroke
        stroke: element.stroke || element.style?.stroke || null,
        strokeWidth: element.strokeWidth || element.style?.strokeWidth || 0,

        // Layout
        padding: element.padding || element.style?.padding || 0,
        cornerRadius: element.cornerRadius || element.style?.cornerRadius || 0,
        opacity: element.opacity != null ? element.opacity : (element.style?.opacity || 1),

        // Image specific
        fit: element.fit || element.style?.fit || 'contain'
      }
    };

    elements.push(normalized);

    // Extract variables from text content
    if (normalized.content && typeof normalized.content === 'string') {
      const matches = normalized.content.match(/{{([^}]+)}}/g);
      if (matches) {
        matches.forEach(match => {
          const varName = match.replace(/[{}]/g, '');
          if (!variables.includes(varName)) {
            variables.push(varName);
          }
        });
      }
    }
  });

  return {
    elements,
    variables,
    canvas: {
      size: canvasState.canvasSize
    }
  };
}

/**
 * Generate complete HTML document with proper TB365 element rendering
 * Fixed to handle positions, sizes, z-index, element types, and styles correctly
 */
function generateHTML(parsedData, options = {}) {
  const { elements, canvas } = parsedData;

  // Base CSS with proper body styling
  let css = `
    body {
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
    }
    .tb365-canvas {
      position: relative;
      width: ${canvas.size.width}px;
      height: ${canvas.size.height}px;
      margin: 20px auto;
      border: 1px solid #ddd;
      background: white;
      overflow: hidden;
    }
    .tb365-element {
      position: absolute;
      box-sizing: border-box;
    }
  `;

  // Generate HTML for elements with proper rendering
  let elementsHtml = '';

  elements.forEach(element => {
    elementsHtml += renderElement(element);
  });

  // Complete HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TB365 Generated Document</title>
  <style>${css}</style>
</head>
<body>
  <div class="tb365-canvas">
${elementsHtml}  </div>
</body>
</html>`;

  return {
    html,
    metadata: {
      elements: elements.length,
      variables: parsedData.variables.length,
      canvasSize: `${canvas.size.width}x${canvas.size.height}`,
      generationTime: new Date().toISOString()
    }
  };
}

/**
 * Render individual element with proper positioning, sizing, and styling
 */
function renderElement(element) {
  // Base positioning and sizing (preserve exact values including decimals)
  const baseStyle = `
    left: ${element.position.x}px;
    top: ${element.position.y}px;
    width: ${element.size.width}px;
    height: ${element.size.height}px;
    z-index: ${element.zIndex || 0};
  `.replace(/\s+/g, ' ').trim();

  switch (element.type) {
    case 'text':
      return renderTextElement(element, baseStyle);
    case 'rectangle':
      return renderRectangleElement(element, baseStyle);
    case 'image':
      return renderImageElement(element, baseStyle);
    case 'table':
      return renderTableElement(element, baseStyle);
    default:
      return renderGenericElement(element, baseStyle);
  }
}

/**
 * Render text element with proper typography and layout
 */
function renderTextElement(element, baseStyle) {
  const textStyle = `
    ${baseStyle}
    font-size: ${element.style.fontSize || 16}px;
    font-family: ${element.style.fontFamily || 'Arial'};
    font-weight: ${element.style.fontWeight || 'normal'};
    font-style: ${element.style.fontStyle || 'normal'};
    color: ${element.style.color || '#000000'};
    background-color: ${element.style.backgroundColor || 'transparent'};
    text-align: ${element.style.textAlign || 'left'};
    white-space: pre-line;
    padding: ${element.style.padding || 0}px;
    line-height: ${element.style.lineHeight || 1.2};
    border-radius: ${element.style.cornerRadius || 0}px;
    opacity: ${element.style.opacity || 1};
  `.replace(/\s+/g, ' ').trim();

  return `<div class="tb365-element" style="${textStyle}">${element.content || ''}</div>\n`;
}

/**
 * Render rectangle element with proper fill, stroke, and corner radius
 */
function renderRectangleElement(element, baseStyle) {
  const borderStyle = element.style.strokeWidth ?
    `${element.style.strokeWidth}px solid ${element.style.stroke || '#000000'}` : 'none';

  const rectStyle = `
    ${baseStyle}
    background-color: ${element.style.fill || element.style.backgroundColor || 'transparent'};
    border: ${borderStyle};
    border-radius: ${element.style.cornerRadius || 0}px;
    opacity: ${element.style.opacity || 1};
    padding: ${element.style.padding || 0}px;
  `.replace(/\s+/g, ' ').trim();

  const content = element.content || '';
  return `<div class="tb365-element" style="${rectStyle}">${content}</div>\n`;
}

/**
 * Render image element with proper src, fit, and opacity
 */
function renderImageElement(element, baseStyle) {
  const fit = element.style.fit || 'contain';
  const opacity = element.style.opacity || 1;

  if (element.src) {
    const imageStyle = `
      ${baseStyle}
      opacity: ${opacity};
      border-radius: ${element.style.cornerRadius || 0}px;
      overflow: hidden;
    `.replace(/\s+/g, ' ').trim();

    const imgStyle = `
      width: 100%;
      height: 100%;
      object-fit: ${fit};
      display: block;
    `.replace(/\s+/g, ' ').trim();

    return `<div class="tb365-element" style="${imageStyle}"><img src="${element.src}" alt="${element.alt || ''}" style="${imgStyle}"></div>\n`;
  } else {
    // Image placeholder
    const placeholderStyle = `
      ${baseStyle}
      background: #f5f5f5;
      border: 1px dashed #999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-family: Arial, sans-serif;
      font-size: 14px;
      opacity: ${opacity};
      border-radius: ${element.style.cornerRadius || 0}px;
    `.replace(/\s+/g, ' ').trim();

    return `<div class="tb365-element" style="${placeholderStyle}">📷 Image</div>\n`;
  }
}

/**
 * Render table element with proper rows, columns, and styling
 */
function renderTableElement(element, baseStyle) {
  const tableData = element.data || { headers: [], rows: [] };
  const headers = tableData.headers || [];
  const rows = tableData.rows || [];

  const containerStyle = `
    ${baseStyle}
    padding: ${element.style.padding || 0}px;
    background-color: ${element.style.backgroundColor || 'transparent'};
    border-radius: ${element.style.cornerRadius || 0}px;
    opacity: ${element.style.opacity || 1};
  `.replace(/\s+/g, ' ').trim();

  const tableStyle = `
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    font-family: ${element.style.fontFamily || 'Arial'};
    font-size: ${element.style.fontSize || 14}px;
  `.replace(/\s+/g, ' ').trim();

  let tableHtml = `<table style="${tableStyle}">`;

  // Headers
  if (headers.length > 0) {
    tableHtml += '<thead><tr>';
    headers.forEach(header => {
      tableHtml += `<th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; text-align: left;">${header}</th>`;
    });
    tableHtml += '</tr></thead>';
  }

  // Rows
  if (rows.length > 0) {
    tableHtml += '<tbody>';
    rows.forEach(row => {
      tableHtml += '<tr>';
      row.forEach(cell => {
        tableHtml += `<td style="border: 1px solid #ccc; padding: 8px;">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
  }

  tableHtml += '</table>';

  return `<div class="tb365-element" style="${containerStyle}">${tableHtml}</div>\n`;
}

/**
 * Render generic/unknown element type
 */
function renderGenericElement(element, baseStyle) {
  const genericStyle = `
    ${baseStyle}
    background: #f0f0f0;
    border: 1px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-family: Arial, sans-serif;
    font-size: 12px;
  `.replace(/\s+/g, ' ').trim();

  return `<div class="tb365-element" style="${genericStyle}">${element.type || 'Unknown'}</div>\n`;
}

/**
 * Replace variables in HTML with actual data
 * Extracted from integration-api/minimal-converter/handler.js
 */
function replaceVariables(html, data) {
  let result = html;

  // Simple variable replacement
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key]);
  });

  return result;
}

/**
 * Main conversion function
 * Complete TB365 → HTML conversion with optional variable replacement
 */
function convertTB365ToHTML(tb365Data, data = {}, options = {}) {
  // Step 1: Parse TB365 format
  const parsedData = parseTB365(tb365Data);

  // Step 2: Generate HTML
  const htmlResult = generateHTML(parsedData, options);

  // Step 3: Replace variables if data provided
  let finalHtml = htmlResult.html;
  if (Object.keys(data).length > 0) {
    finalHtml = replaceVariables(htmlResult.html, data);
  }

  // Return complete conversion result
  return {
    conversionId: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'completed',
    htmlResult: {
      html: finalHtml,
      metadata: htmlResult.metadata,
      size: finalHtml.length,
      sizeKB: Math.round(finalHtml.length / 1024)
    },
    originalProject: {
      name: tb365Data.projectName,
      version: tb365Data.version,
      elements: parsedData.elements.length,
      canvasSize: parsedData.canvas.size,
      variables: parsedData.variables.length
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  parseTB365,
  generateHTML,
  replaceVariables,
  convertTB365ToHTML
};