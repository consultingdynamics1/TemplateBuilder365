# TemplateBuilder365 - CLAUDE.md

## Project Overview

**TemplateBuilder365** is a React-based visual template builder application that allows users to create, edit, and manage design templates. It's built with TypeScript, React 19, and Konva.js for 2D canvas rendering, providing a Figma-like design experience in the browser.

## Architecture

### Tech Stack
- **Frontend**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.2 
- **Canvas Rendering**: Konva.js 9.3.22 with react-konva 19.0.7
- **State Management**: Zustand 5.0.8 with Immer for immutable updates
- **Development**: ESLint, TypeScript strict mode
- **Server**: Runs on port 5174

### Key Dependencies
- `konva` & `react-konva` - 2D canvas library for rendering elements
- `zustand` - Lightweight state management
- `immer` - Immutable state updates
- `react-konva-utils` - Additional utilities for Konva integration

## Project Structure

```
src/
├── components/
│   ├── Canvas/
│   │   ├── Canvas.tsx           # Main canvas component with Konva Stage
│   │   ├── CanvasElement.tsx    # Individual element renderer
│   │   ├── TableElement.tsx     # Table element component
│   │   └── index.ts
│   ├── PropertiesPanel/
│   │   ├── PropertiesPanel.tsx  # Element properties editor
│   │   └── index.ts
│   ├── SaveDialog/
│   │   └── SaveDialog.tsx       # File save dialog component
│   └── Toolbar/
│       ├── Toolbar.tsx          # Main toolbar with tools and actions
│       └── index.ts
├── stores/
│   └── canvasStore.ts           # Zustand store with canvas state management
├── types/
│   └── index.ts                 # TypeScript type definitions
├── utils/
│   ├── index.ts
│   └── projectFiles.ts          # File save/load utilities
├── App.tsx                      # Root app component
└── main.tsx                     # React app entry point
```

## Core Features

### 1. Element Types
- **Text Elements**: Editable text with font styling, alignment, colors
- **Rectangle Elements**: Shapes with fill, stroke, corner radius
- **Image Elements**: Image placeholders with file upload and drag-drop support
- **Table Elements**: Editable data tables with headers and cells

### 2. Canvas Features
- **Zoom Controls**: 10%-200% zoom with fit-to-screen functionality
- **Grid System**: Optional snap-to-grid with configurable grid size (default 20px)
- **Pan & Zoom**: Mouse wheel zoom, drag to pan canvas
- **Element Management**: Select, move, resize, duplicate, delete elements
- **Layer Management**: Bring to front/send to back (z-index control)

### 3. Editing Capabilities
- **Direct Text Editing**: Double-click text elements to edit inline
- **Table Cell Editing**: Click table cells to edit content with overlay input
- **Properties Panel**: Comprehensive property editor for selected elements
- **Keyboard Shortcuts**: 
  - `V` - Select tool
  - `T` - Text tool  
  - `R` - Rectangle tool
  - `I` - Image tool
  - `B` - Table tool
  - `Ctrl+S` - Save project
  - `Ctrl+D` - Duplicate element
  - `Del/Backspace` - Delete element

### 4. File Management
- **Project Save/Load**: Custom `.tb365` file format with JSON structure
- **Browser Download**: Files download to user's device
- **Template System**: Includes sample real estate template

## Development Workflow

### Available Scripts
```bash
npm run dev        # Start development server on port 5174
npm run build      # Build for production (TypeScript compile + Vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Development Environment
- **Hot Module Replacement (HMR)**: Enabled via Vite
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Configured with React Hooks and React Refresh plugins
- **Fast Refresh**: Automatic component updates during development

## State Management

The application uses Zustand with Immer for state management. The main store (`canvasStore.ts`) manages:

- **Canvas State**: Elements array, selected element, editing modes
- **Viewport State**: Zoom level, canvas size, grid settings  
- **Tool State**: Active tool, snap-to-grid toggle
- **Element Operations**: Add, update, delete, move, resize elements

### Key Store Actions
- `addElement(type, position)` - Create new element
- `selectElement(id)` - Select element for editing
- `updateElement(id, updates)` - Update element properties
- `moveElement(id, position)` - Move element (with grid snapping)
- `resizeElement(id, size)` - Resize element
- `setZoom(level)` - Update zoom level
- `fitToScreen(viewport)` - Auto-fit canvas to viewport

## Component Architecture

### Canvas Component (`src/components/Canvas/Canvas.tsx`)
- Konva Stage wrapper with event handling
- Manages pan/zoom, element selection, tool interactions
- Drag-and-drop image upload support
- Grid rendering when snap-to-grid enabled
- Table cell editing overlay system

### Toolbar Component (`src/components/Toolbar/Toolbar.tsx`)
- Tool selection (select, text, rectangle, image, table)
- File operations (save/load projects)
- Element operations (duplicate, delete, bring to front/back)
- Zoom controls and fit-to-screen
- Grid toggle

### Properties Panel (`src/components/PropertiesPanel/PropertiesPanel.tsx`)
- Context-sensitive property editor
- Text formatting (font, size, color, alignment)
- Shape properties (fill, stroke, corner radius)
- Image properties (opacity, fit mode)
- Table properties (rows, columns, styling)

## File Format

Projects are saved as `.tb365` JSON files with this structure:

```json
{
  "projectName": "Template Name",
  "savedAt": "2025-01-XX...",
  "version": "1.0",
  "canvasState": {
    "elements": [...],
    "canvasSize": { "width": 800, "height": 600 },
    "zoom": 1,
    "snapToGrid": false,
    "gridSize": 20
  }
}
```

## Performance Considerations

- **Zustand + Immer**: Efficient immutable state updates
- **Konva.js**: Hardware-accelerated 2D rendering
- **Element Sorting**: Z-index based rendering order
- **Selective Re-rendering**: Only affected elements re-render on updates
- **File Handling**: Client-side file operations (no server dependency)

## Development Notes

### Adding New Element Types
1. Add type definition to `src/types/index.ts`
2. Update `ElementType` union and `TemplateElement` type
3. Add creation logic in `canvasStore.ts` `createDefaultElement` function
4. Implement renderer in `CanvasElement.tsx`
5. Add tool button and icon in `Toolbar.tsx`
6. Add properties UI in `PropertiesPanel.tsx`

### Keyboard Shortcut Integration
Shortcuts are handled in `Toolbar.tsx` with a `useEffect` that listens for keydown events. The handler checks if focus is on input elements to avoid conflicts.

### Canvas Coordinate System
- Canvas uses Konva's coordinate system (0,0 at top-left)
- Zoom scaling affects positioning calculations
- Stage position offset must be considered for UI overlays
- Grid snapping rounds positions to grid boundaries

## Known Features & Behaviors

- **Auto-tool switching**: After placing an element, tool switches back to select (Figma-style)
- **Element naming**: Auto-generated semantic names (e.g., "text-field-1234", "background-box-5678")
- **Drag and drop**: Images can be dragged directly onto canvas
- **File picker fallback**: Image tool opens file picker when clicking canvas
- **Table editing**: Click cells to edit, Enter saves, Escape cancels
- **Zoom limits**: 10% to 200% zoom range with smooth scaling
- **Canvas centering**: Canvas auto-centers when smaller than viewport

## Testing & Deployment

- **TypeScript Compilation**: `tsc -b` for type checking
- **Build Process**: `vite build` creates optimized production bundle
- **Static Hosting**: Built files can be served from any static host
- **No Backend Required**: Fully client-side application (files download to browser)

---

# Integration API System

## Serverless Conversion Pipeline

**Phase 2 Development**: Built a complete serverless AWS Lambda API system for converting TB365 design format to HTML with variable replacement and multi-format output generation.

### Architecture Overview

```
TB365 Design → HTML Generation → Variable Replacement → Multi-Format Rendering
     ↓              ↓                      ↓                    ↓
  Validation     CSS Generation      Business Data        PDF/PNG Output
```

## Integration API Structure

```
integration-api/
├── functions/
│   └── tb365-converter.js           # Main AWS Lambda handler
├── services/
│   ├── tb365-parser.js              # TB365 format validation and parsing
│   ├── html-generator.js            # Complete HTML document generation
│   ├── variable-replacer.js         # Production-ready variable replacement
│   ├── renderer.js                  # Local Puppeteer PDF/PNG generation
│   ├── content-processor.js         # Mixed content handling
│   ├── output-manager.js            # Flexible output destination management
│   ├── css-generator.js             # Dynamic CSS generation
│   └── data-extractor.js            # Variable extraction utilities
├── utils/
│   ├── validation.js                # Input validation with Joi schemas
│   ├── s3-client.js                 # AWS S3 integration utilities
│   └── response-helper.js           # Lambda response formatting
├── test-output/                     # Organized test results with timestamps
└── serverless.yml                   # AWS deployment configuration
```

## Core Services

### TB365 Parser (`services/tb365-parser.js`)
- **Purpose**: Validates and parses TB365 design format
- **Features**: Schema validation, element grouping, variable extraction
- **Performance**: 5ms for complex templates with 7+ elements
- **Validation**: Comprehensive error handling with detailed feedback

### HTML Generator (`services/html-generator.js`)
- **Purpose**: Creates complete HTML documents with embedded CSS
- **Features**: Responsive design, element positioning, font loading
- **Performance**: 2ms generation time for complex layouts
- **Output**: Self-contained HTML with embedded styles

### Variable Replacer (`services/variable-replacer.js`)
- **Purpose**: Production-ready variable replacement with security
- **Features**: XSS protection, automatic formatting, nested data support
- **Performance**: 17ms with 100% replacement success rate
- **Security**: HTML injection prevention, data sanitization

### Local Renderer (`services/renderer.js`)
- **Purpose**: Puppeteer-based PDF and PNG generation
- **Features**: High-quality screenshots, multiple formats, error recovery
- **Performance**: 3s for 1200x800px professional output
- **Output**: 116KB PNG files, A4 PDF documents

## Lambda Handler Integration

### Main Handler (`functions/tb365-converter.js`)
- **Authentication**: API key validation with development bypass
- **Routes**: `/convert`, `/output-config`, health endpoints
- **Error Handling**: Comprehensive error responses with stage tracking
- **Variable Replacement**: Optional step when data provided

### Sample Request
```json
{
  "tb365Data": {
    "projectName": "Real Estate Flyer",
    "canvasState": {
      "elements": [...]
    }
  },
  "data": {
    "agency": { "name": "Mountain View Realty" },
    "property": { "price": "895000", "address": "..." }
  },
  "options": {
    "outputFormat": "json",
    "escapeHtml": false
  }
}
```

## Testing Suite

### Complete Pipeline Test (`test-complete-pipeline.js`)
- **Scope**: Full TB365 → HTML → Variables → Multi-format pipeline
- **Output Structure**: Timestamped directories with organized files
- **Validation**: HTML files, PNG screenshots, metadata, business data
- **Performance Tracking**: Stage-by-stage timing and file size metrics

### Test Files Generated:
```
test-output/2025-09-12_14-49-29/
├── input-tb365.json (5KB)      # Original TB365 design data
├── data.json (1KB)             # Business variable data  
├── template.html (6KB)         # Generated HTML with {{variables}}
├── final.html (6KB)            # Final HTML with data replaced
├── output.png (116KB)          # High-quality screenshot
└── metadata.json (2KB)         # Complete pipeline statistics
```

### Production Test Results
- **TB365 Parsing**: ✅ 5ms for 7 elements, 18 variables
- **HTML Generation**: ✅ 2ms with embedded CSS (6KB output)
- **Variable Replacement**: ✅ 17ms with 18/18 variables replaced (100%)
- **PNG Generation**: ✅ 3.0s for 1200x800px professional quality (116KB)
- **PDF Generation**: ⚠️ 3.7s with connection stability issues (known limitation)

## Security & Validation Features

### Input Validation
- **Template Size**: 10MB limit with performance warnings at 1000+ variables
- **Data Types**: Object validation with null/undefined handling
- **XSS Protection**: Aggressive sanitization of `<script>`, `javascript:`, `onload=`
- **Format Validation**: Phone numbers (7-15 digits), email, URL format checking

### Error Handling
- **Graceful Degradation**: Continue processing with partial failures
- **Memory Management**: Automatic cleanup with garbage collection
- **Stage Tracking**: Detailed error reporting by pipeline stage
- **Security Warnings**: Flagging of potentially malicious content

## Performance Metrics

### Proven Benchmarks
| Stage | Duration | Success Rate | Output Quality |
|-------|----------|-------------|----------------|
| TB365 Parsing | 5ms | 100% | 7 elements, 18 variables |
| HTML Generation | 2ms | 100% | 6KB responsive HTML |
| Variable Replacement | 17ms | 100% | All variables replaced |
| PNG Generation | 3.0s | 100% | 116KB high-quality |
| **Total Pipeline** | **7.1s** | **80%** | **Professional documents** |

### Scalability Testing
- **Concurrent Requests**: 10 simultaneous variable replacements
- **Memory Usage**: <5MB increase under load
- **Rate Limiting**: 10,000+ replacements/second capability
- **Error Recovery**: Non-blocking failures with continued processing

## AWS Deployment Configuration

### Serverless Framework (`serverless.yml`)
- **Runtime**: Node.js 18.x with 10-minute timeout
- **Memory**: 1GB allocated for Puppeteer rendering
- **API Gateway**: REST API with CORS enabled
- **S3 Integration**: Multiple bucket support (dev/prod)
- **IAM Permissions**: S3 read/write, CloudWatch logging

### Environment Variables
```yaml
environment:
  API_KEY: ${env:API_KEY}
  S3_BUCKET_DEV: tb365-output-dev
  S3_BUCKET_PROD: tb365-output-prod
  OUTPUT_MODE: response-only
```

## Available Commands

### Testing Scripts
```bash
npm run test:pipeline      # Complete pipeline test
npm run test:end-to-end    # TB365 → HTML → Variables
npm run test:variables     # Variable replacement only
npm run test:renderer      # PNG generation test
npm run test:production    # Security and validation tests
```

### Deployment Scripts
```bash
npm run deploy:dev         # Deploy to development
npm run deploy:prod        # Deploy to production  
npm run invoke:local       # Local Lambda testing
```

## Integration Readiness

### Production Ready Features
✅ **Security**: XSS protection, input validation, data sanitization  
✅ **Performance**: Sub-second processing for most stages  
✅ **Reliability**: Comprehensive error handling and recovery  
✅ **Scalability**: Designed for concurrent Lambda execution  
✅ **Monitoring**: Detailed logging and performance metrics  
✅ **Testing**: Complete test coverage with sample outputs  

### AWS Lambda Optimizations Needed
- **Puppeteer Lambda Layer**: For production PDF generation
- **Memory Management**: Optimize for 512MB-1GB Lambda limits
- **Cold Start**: Pre-warm browser instances
- **Timeout Handling**: 15-minute Lambda limit management

## Future Enhancement Opportunities

### Original Frontend Enhancements
- Additional element types (circles, lines, arrows)
- Advanced table features (merge cells, formulas)
- Collaboration features
- Component library and reusable templates
- Undo/redo functionality

### Integration API Enhancements
- **Stage 2 Rendering**: Lambda-optimized Puppeteer with layers
- **S3 Integration**: Direct upload with presigned URLs
- **Webhook Support**: Real-time conversion notifications
- **Template Library**: Pre-built business templates
- **Batch Processing**: Multiple template conversion
- **Analytics**: Usage metrics and performance monitoring