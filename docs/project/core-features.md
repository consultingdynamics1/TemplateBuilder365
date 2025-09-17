# Core Features

## Element Types

### 1. Text Elements
- Editable text with font styling, alignment, colors
- Direct inline editing (double-click to edit)
- Font family, size, weight, style controls
- Text alignment (left, center, right)
- Color picker for text color

### 2. Rectangle Elements
- Shapes with fill, stroke, corner radius
- Fill color with opacity control
- Stroke color and width
- Corner radius for rounded rectangles
- Border styling options

### 3. Image Elements
- Image placeholders with file upload and drag-drop support
- Drag images directly onto canvas
- File picker fallback when clicking canvas
- Opacity and fit mode controls
- Support for common image formats

### 4. Table Elements
- Editable data tables with headers and cells
- Click table cells to edit content with overlay input
- Add/remove rows and columns
- Cell styling and formatting
- Header row styling

## Canvas Features

### Zoom Controls
- **Range**: 10%-200% zoom with smooth scaling
- **Fit-to-screen**: Auto-fit canvas to viewport
- **Mouse wheel zoom**: Natural zoom interaction
- **Zoom limits**: Prevents excessive zoom levels

### Grid System
- **Optional snap-to-grid**: Configurable grid size (default 20px)
- **Visual grid**: Shows when snap-to-grid enabled
- **Grid snapping**: Rounds positions to grid boundaries
- **Toggle control**: Easy on/off in toolbar

### Pan & Zoom
- **Mouse wheel zoom**: Standard zoom interaction
- **Drag to pan**: Move canvas viewport when zoomed
- **Canvas centering**: Auto-centers when smaller than viewport
- **Coordinate system**: Konva's system (0,0 at top-left)

### Element Management
- **Select**: Click elements to select for editing
- **Move**: Drag elements with grid snapping
- **Resize**: Drag handles to resize elements
- **Duplicate**: `Ctrl+D` to duplicate selected element
- **Delete**: `Del/Backspace` to delete selected element
- **Layer Management**: Bring to front/send to back (z-index control)

## Editing Capabilities

### Direct Text Editing
- **Double-click activation**: Start editing text elements
- **Inline editing**: Edit text directly on canvas
- **Auto-save**: Changes save automatically on blur
- **Rich formatting**: Font, size, color, alignment

### Table Cell Editing
- **Click to edit**: Click any table cell to start editing
- **Overlay input**: Input appears over cell for editing
- **Enter to save**: Confirm changes with Enter key
- **Escape to cancel**: Cancel editing without saving

### Properties Panel
- **Context-sensitive**: Shows properties for selected element
- **Text formatting**: Font, size, color, alignment controls
- **Shape properties**: Fill, stroke, corner radius
- **Image properties**: Opacity, fit mode
- **Table properties**: Rows, columns, styling

## Keyboard Shortcuts

### Tool Selection
- `V` - Select tool (default)
- `T` - Text tool
- `R` - Rectangle tool
- `I` - Image tool
- `B` - Table tool

### File Operations
- `Ctrl+S` - Save project
- `Ctrl+O` - Load project (planned)

### Element Operations
- `Ctrl+D` - Duplicate selected element
- `Del/Backspace` - Delete selected element
- `Ctrl+Z` - Undo (planned)
- `Ctrl+Y` - Redo (planned)

## File Management

### Project Save/Load
- **Custom format**: `.tb365` file format with JSON structure
- **Browser download**: Files download to user's device
- **Save dialog**: Enhanced with folder selection in development
- **Auto-naming**: Semantic element names (e.g., "text-field-1234")

### Template System
- **Sample templates**: Includes real estate template
- **New document**: Clear canvas with A4 default size
- **Canvas sizes**: A4 default (794×1123px) for professional documents

## Known Features & Behaviors

### Tool Behavior
- **Auto-tool switching**: After placing element, switches back to select (Figma-style)
- **Element creation**: Click canvas to create elements at cursor position
- **Default sizes**: New elements created with reasonable default dimensions

### Canvas Behavior
- **A4 default**: New documents start with A4 size (794×1123px)
- **Viewport management**: Canvas centers automatically when smaller than viewport
- **Performance**: Hardware-accelerated rendering via Konva.js

### Element Behavior
- **Auto-naming**: Elements get semantic names automatically
- **Z-index ordering**: Elements render in layer order
- **Snap to grid**: Optional grid snapping for precise positioning
- **Selection feedback**: Visual selection indicators on active elements

## Performance Considerations

- **Zustand + Immer**: Efficient immutable state updates
- **Konva.js**: Hardware-accelerated 2D rendering
- **Element sorting**: Z-index based rendering order
- **Selective re-rendering**: Only affected elements re-render on updates
- **File handling**: Client-side operations (no server dependency)

## Future Enhancements

### Planned Features
- Additional element types (circles, lines, arrows)
- Advanced table features (merge cells, formulas)
- Collaboration features
- Component library and reusable templates
- Undo/redo functionality
- Layer panel for advanced layer management
- Group/ungroup elements
- Alignment and distribution tools