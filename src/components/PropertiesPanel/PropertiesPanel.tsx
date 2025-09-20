import React from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { imageService } from '../../utils/imageService';
import type { TemplateElement, TextElement, RectangleElement, ImageElement, TableElement } from '../../types';
import './PropertiesPanel.css';

const TextProperties: React.FC<{ element: TextElement }> = ({ element }) => {
  const { updateElement, editingElementId, exitEditMode } = useCanvasStore();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isEditing = editingElementId === element.id;

  // Auto-focus textarea when entering edit mode with smooth scrolling
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Smooth scroll the textarea into view first
      textareaRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Focus and select with a small delay to ensure scrolling completes
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 200);
    }
  }, [isEditing]);

  const handleUpdate = (updates: Partial<TextElement>) => {
    updateElement(element.id, updates);
  };

  const handleContentBlur = () => {
    // Use setTimeout to delay exit, allowing other clicks to be processed first
    setTimeout(() => {
      if (isEditing) {
        exitEditMode();
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isEditing) {
      exitEditMode();
    }
  };

  return (
    <div className="property-group">
      <h3>Text Properties</h3>
      
      <div className="property-field">
        <label>Content {isEditing && <span style={{color: '#2196f3', fontSize: '0.75rem'}}>(Editing)</span>}</label>
        <textarea
          ref={textareaRef}
          value={element.content}
          onChange={(e) => handleUpdate({ content: e.target.value })}
          onBlur={handleContentBlur}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{
            borderColor: isEditing ? '#2196f3' : undefined,
            boxShadow: isEditing ? '0 0 0 2px rgba(33, 150, 243, 0.2)' : undefined,
          }}
        />
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Font Size</label>
          <input
            type="number"
            value={element.fontSize}
            onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })}
            min="8"
            max="200"
          />
        </div>
        <div className="property-field">
          <label>Font Family</label>
          <select
            value={element.fontFamily}
            onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Font Weight</label>
          <select
            value={element.fontWeight}
            onChange={(e) => handleUpdate({ fontWeight: e.target.value as 'normal' | 'bold' })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>
        <div className="property-field">
          <label>Text Align</label>
          <select
            value={element.textAlign}
            onChange={(e) => handleUpdate({ textAlign: e.target.value as 'left' | 'center' | 'right' })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Text Color</label>
          <input
            type="color"
            value={element.color}
            onChange={(e) => handleUpdate({ color: e.target.value })}
          />
        </div>
        <div className="property-field">
          <label>Background</label>
          <input
            type="color"
            value={element.backgroundColor || '#ffffff'}
            onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
          />
        </div>
      </div>

      <div className="property-field">
        <label>Padding</label>
        <input
          type="number"
          value={element.padding}
          onChange={(e) => handleUpdate({ padding: parseInt(e.target.value) })}
          min="0"
          max="50"
        />
      </div>
    </div>
  );
};

const RectangleProperties: React.FC<{ element: RectangleElement }> = ({ element }) => {
  const { updateElement } = useCanvasStore();

  const handleUpdate = (updates: Partial<RectangleElement>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="property-group">
      <h3>Rectangle Properties</h3>
      
      <div className="property-row">
        <div className="property-field">
          <label>Fill Color</label>
          <input
            type="color"
            value={element.fill}
            onChange={(e) => handleUpdate({ fill: e.target.value })}
          />
        </div>
        <div className="property-field">
          <label>Stroke Color</label>
          <input
            type="color"
            value={element.stroke}
            onChange={(e) => handleUpdate({ stroke: e.target.value })}
          />
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Stroke Width</label>
          <input
            type="number"
            value={element.strokeWidth}
            onChange={(e) => handleUpdate({ strokeWidth: parseInt(e.target.value) })}
            min="0"
            max="20"
          />
        </div>
        <div className="property-field">
          <label>Corner Radius</label>
          <input
            type="number"
            value={element.cornerRadius}
            onChange={(e) => handleUpdate({ cornerRadius: parseInt(e.target.value) })}
            min="0"
            max="50"
          />
        </div>
      </div>
    </div>
  );
};

const ImageProperties: React.FC<{ element: ImageElement }> = ({ element }) => {
  const { updateElement } = useCanvasStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdate = (updates: Partial<ImageElement>) => {
    updateElement(element.id, updates);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        // Always use blob URL - upload happens during save
        const blobUrl = imageService.createBlobUrl(file);
        handleUpdate({ src: blobUrl });
      } catch (error) {
        console.error('Image validation failed:', error);
        alert(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Reset file input on validation failure
        event.target.value = '';
        return;
      }
    } else if (file) {
      // Non-image file selected
      alert('Please select a valid image file (JPG, PNG, or WebP).');
      event.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="property-group">
      <h3>Image Properties</h3>
      
      <div className="property-field">
        <label>Image Source</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={triggerFileUpload}
            style={{
              padding: '8px 12px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Upload Image
          </button>
          <span style={{ fontSize: '0.75rem', color: '#666', flex: 1 }}>
            {element.src ? (
              element.src.startsWith('blob:') ? 'Local file uploaded' : 'URL loaded'
            ) : 'No image selected'}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      <div className="property-field">
        <label>Or enter URL</label>
        <input
          type="url"
          value={element.src?.startsWith('blob:') ? '' : element.src || ''}
          onChange={(e) => handleUpdate({ src: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={element.opacity}
            onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
          />
          <span className="range-value">{Math.round(element.opacity * 100)}%</span>
        </div>
        <div className="property-field">
          <label>Fit</label>
          <select
            value={element.fit}
            onChange={(e) => handleUpdate({ fit: e.target.value as ImageElement['fit'] })}
          >
            <option value="fill">Fill</option>
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const TableProperties: React.FC<{ element: TableElement }> = ({ element }) => {
  const { updateElement } = useCanvasStore();

  const handleUpdate = (updates: Partial<TableElement>) => {
    updateElement(element.id, updates);
  };

  const handleCellUpdate = (rowIndex: number, colIndex: number, content: string) => {
    const newCells = [...element.cells];
    if (newCells[rowIndex] && newCells[rowIndex][colIndex]) {
      newCells[rowIndex][colIndex] = { ...newCells[rowIndex][colIndex], content };
      handleUpdate({ cells: newCells });
    }
  };

  const addRow = () => {
    const newRow = Array(element.columns).fill(null).map((_, colIndex) => ({
      content: `Cell ${element.rows + 1},${colIndex + 1}`,
      isHeader: false
    }));
    const newCells = [...element.cells, newRow];
    handleUpdate({ cells: newCells, rows: element.rows + 1 });
  };

  const removeRow = () => {
    if (element.rows > 1) {
      const newCells = element.cells.slice(0, -1);
      handleUpdate({ cells: newCells, rows: element.rows - 1 });
    }
  };

  const addColumn = () => {
    const newCells = element.cells.map((row, rowIndex) => [
      ...row,
      { content: `Cell ${rowIndex + 1},${element.columns + 1}`, isHeader: rowIndex === 0 }
    ]);
    handleUpdate({ cells: newCells, columns: element.columns + 1 });
  };

  const removeColumn = () => {
    if (element.columns > 1) {
      const newCells = element.cells.map(row => row.slice(0, -1));
      handleUpdate({ cells: newCells, columns: element.columns - 1 });
    }
  };

  return (
    <div className="property-group">
      <h3>Table Properties</h3>
      
      <div className="property-row">
        <div className="property-field">
          <label>Rows: {element.rows}</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={addRow} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>+</button>
            <button onClick={removeRow} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>−</button>
          </div>
        </div>
        <div className="property-field">
          <label>Columns: {element.columns}</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={addColumn} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>+</button>
            <button onClick={removeColumn} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>−</button>
          </div>
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Font Size</label>
          <input
            type="number"
            value={element.fontSize}
            onChange={(e) => handleUpdate({ fontSize: parseInt(e.target.value) })}
            min="8"
            max="72"
          />
        </div>
        <div className="property-field">
          <label>Font Family</label>
          <select
            value={element.fontFamily}
            onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Border Color</label>
          <input
            type="color"
            value={element.borderColor}
            onChange={(e) => handleUpdate({ borderColor: e.target.value })}
          />
        </div>
        <div className="property-field">
          <label>Border Width</label>
          <input
            type="number"
            value={element.borderWidth}
            onChange={(e) => handleUpdate({ borderWidth: parseInt(e.target.value) })}
            min="0"
            max="10"
          />
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Header Background</label>
          <input
            type="color"
            value={element.headerBackground}
            onChange={(e) => handleUpdate({ headerBackground: e.target.value })}
          />
        </div>
        <div className="property-field">
          <label>Cell Background</label>
          <input
            type="color"
            value={element.cellBackground}
            onChange={(e) => handleUpdate({ cellBackground: e.target.value })}
          />
        </div>
      </div>

      <div className="property-field">
        <label>Cell Content</label>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '8px' }}>
          {element.cells.map((row, rowIndex) => (
            <div key={rowIndex} style={{ marginBottom: '8px' }}>
              <strong>Row {rowIndex + 1}:</strong>
              {row.map((cell, colIndex) => (
                <input
                  key={`${rowIndex}-${colIndex}`}
                  type="text"
                  value={cell.content}
                  onChange={(e) => handleCellUpdate(rowIndex, colIndex, e.target.value)}
                  placeholder={`R${rowIndex + 1}C${colIndex + 1}`}
                  style={{ 
                    width: '100%', 
                    margin: '2px 0', 
                    padding: '4px',
                    fontSize: '0.75rem'
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CommonProperties: React.FC<{ element: TemplateElement }> = ({ element }) => {
  const { updateElement } = useCanvasStore();

  const handleUpdate = (updates: Partial<TemplateElement>) => {
    updateElement(element.id, updates);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let name = e.target.value;
    // Convert to CSS-safe and template-friendly name
    name = name
      .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace invalid chars with dash
      .replace(/^[^a-zA-Z]/, 'element-') // Ensure starts with letter
      .toLowerCase();
    
    handleUpdate({ name });
  };

  const isValidName = (name: string) => {
    return /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(name);
  };

  return (
    <div className="property-group">
      <h3>Common Properties</h3>
      
      <div className="property-field">
        <label>Element Name</label>
        <input
          type="text"
          value={element.name}
          onChange={handleNameChange}
          placeholder="e.g. customer-name, company-logo"
          style={{
            borderColor: isValidName(element.name) ? undefined : '#f44336',
            backgroundColor: isValidName(element.name) ? undefined : '#ffebee'
          }}
        />
        {!isValidName(element.name) && (
          <div style={{ fontSize: '0.75rem', color: '#f44336', marginTop: '4px' }}>
            Name must start with a letter and contain only letters, numbers, dots, hyphens, or underscores
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
          Used for template fields: {`{{${element.name}}}`}
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>X Position</label>
          <input
            type="number"
            value={element.position.x}
            onChange={(e) => handleUpdate({ 
              position: { ...element.position, x: parseInt(e.target.value) } 
            })}
          />
        </div>
        <div className="property-field">
          <label>Y Position</label>
          <input
            type="number"
            value={element.position.y}
            onChange={(e) => handleUpdate({ 
              position: { ...element.position, y: parseInt(e.target.value) } 
            })}
          />
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>Width</label>
          <input
            type="number"
            value={element.size.width}
            onChange={(e) => handleUpdate({ 
              size: { ...element.size, width: Math.max(10, parseInt(e.target.value)) } 
            })}
            min="10"
          />
        </div>
        <div className="property-field">
          <label>Height</label>
          <input
            type="number"
            value={element.size.height}
            onChange={(e) => handleUpdate({ 
              size: { ...element.size, height: Math.max(10, parseInt(e.target.value)) } 
            })}
            min="10"
          />
        </div>
      </div>

      <div className="property-row">
        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={element.visible}
              onChange={(e) => handleUpdate({ visible: e.target.checked })}
            />
            Visible
          </label>
        </div>
        <div className="property-field">
          <label>
            <input
              type="checkbox"
              checked={element.locked}
              onChange={(e) => handleUpdate({ locked: e.target.checked })}
            />
            Locked
          </label>
        </div>
      </div>
    </div>
  );
};

const CanvasProperties: React.FC = () => {
  const { canvasSize, setCanvasSize } = useCanvasStore();
  
  const presetSizes = [
    { name: 'Custom', width: canvasSize.width, height: canvasSize.height },
    { name: 'Letter (8.5×11")', width: 816, height: 1056 },
    { name: 'A4', width: 794, height: 1123 },
    { name: 'iPhone 14', width: 393, height: 852 },
    { name: 'iPad', width: 820, height: 1180 },
    { name: 'Desktop HD', width: 1920, height: 1080 },
    { name: 'Social Post', width: 1080, height: 1080 },
  ];

  const [selectedPreset, setSelectedPreset] = React.useState('Custom');

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);
    
    const preset = presetSizes.find(p => p.name === presetName);
    if (preset && presetName !== 'Custom') {
      setCanvasSize({ width: preset.width, height: preset.height });
    }
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue > 0) {
      setCanvasSize({
        ...canvasSize,
        [dimension]: numValue
      });
      setSelectedPreset('Custom');
    }
  };

  return (
    <div className="property-group">
      <h3>Canvas Settings</h3>
      
      <div className="property-field">
        <label>Preset Sizes</label>
        <select value={selectedPreset} onChange={handlePresetChange}>
          {presetSizes.map(preset => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="property-field">
        <label>Canvas Size</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            value={canvasSize.width}
            onChange={(e) => handleSizeChange('width', e.target.value)}
            placeholder="Width"
            min="100"
            max="5000"
          />
          <span>×</span>
          <input
            type="number"
            value={canvasSize.height}
            onChange={(e) => handleSizeChange('height', e.target.value)}
            placeholder="Height"
            min="100"
            max="5000"
          />
        </div>
        <small style={{ color: '#666', fontSize: '0.75rem' }}>
          {canvasSize.width} × {canvasSize.height} pixels
        </small>
      </div>
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const { elements, selectedElementId } = useCanvasStore();
  
  const selectedElement = elements.find(el => el.id === selectedElementId);

  if (!selectedElement) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <h2>Canvas Properties</h2>
        </div>
        <div className="panel-content">
          <CanvasProperties />
        </div>
      </div>
    );
  }

  const renderSpecificProperties = () => {
    switch (selectedElement.type) {
      case 'text':
        return <TextProperties element={selectedElement as TextElement} />;
      case 'rectangle':
        return <RectangleProperties element={selectedElement as RectangleElement} />;
      case 'image':
        return <ImageProperties element={selectedElement as ImageElement} />;
      case 'table':
        return <TableProperties element={selectedElement as TableElement} />;
      default:
        return null;
    }
  };

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h2>Properties</h2>
      </div>
      
      <div className="panel-content">
        <CommonProperties element={selectedElement} />
        {renderSpecificProperties()}
      </div>
    </div>
  );
};