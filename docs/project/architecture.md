# Architecture

## State Management

The application uses Zustand with Immer for state management. The main store (`canvasStore.ts`) manages:

### Canvas State
- **Elements array**: All canvas elements with properties
- **Selected element**: Currently active element for editing
- **Editing modes**: Text editing, table cell editing states

### Viewport State
- **Zoom level**: Current canvas zoom (10%-200%)
- **Canvas size**: Width and height of canvas
- **Grid settings**: Snap-to-grid toggle and grid size

### Tool State
- **Active tool**: Current tool selection (select, text, rectangle, image, table)
- **Snap-to-grid toggle**: Grid snapping enabled/disabled

### Element Operations
- `addElement(type, position)` - Create new element at position
- `selectElement(id)` - Select element for editing
- `updateElement(id, updates)` - Update element properties
- `moveElement(id, position)` - Move element (with grid snapping)
- `resizeElement(id, size)` - Resize element dimensions
- `setZoom(level)` - Update zoom level
- `fitToScreen(viewport)` - Auto-fit canvas to viewport

## Component Architecture

### Canvas Component (`src/components/Canvas/Canvas.tsx`)
- **Konva Stage wrapper**: Main rendering container
- **Event handling**: Mouse, keyboard, drag-drop events
- **Pan/zoom management**: Viewport control and interaction
- **Element selection**: Click handling for element selection
- **Tool interactions**: Different behavior per active tool
- **Drag-and-drop**: Image upload support
- **Grid rendering**: Visual grid when snap-to-grid enabled
- **Table cell editing**: Overlay system for table editing

### Toolbar Component (`src/components/Toolbar/Toolbar.tsx`)
- **Tool selection**: Select, text, rectangle, image, table tools
- **File operations**: Save/load project functionality
- **Element operations**: Duplicate, delete, bring to front/back
- **Zoom controls**: Zoom in, zoom out, fit-to-screen
- **Grid toggle**: Enable/disable snap-to-grid
- **User interface**: User display and logout (when authenticated)

### Properties Panel (`src/components/PropertiesPanel/PropertiesPanel.tsx`)
- **Context-sensitive editor**: Shows properties for selected element
- **Text formatting**: Font family, size, color, alignment
- **Shape properties**: Fill color, stroke color/width, corner radius
- **Image properties**: Opacity, fit mode controls
- **Table properties**: Row/column management, styling

### CanvasElement Component (`src/components/Canvas/CanvasElement.tsx`)
- **Element renderer**: Renders individual elements on canvas
- **Type-specific rendering**: Different rendering per element type
- **Selection handles**: Resize handles for selected elements
- **Event forwarding**: Mouse events to parent canvas
- **Performance optimization**: Selective re-rendering

## Environment Configuration

### Variable Replacement System
Source code uses `{{PLACEHOLDER}}` syntax that gets replaced during build/deployment:

```typescript
// src/config/environment.ts
export const CONFIG = {
  ENVIRONMENT: '{{ENVIRONMENT}}',           // 'development' | 'stage' | 'production'
  S3_BUCKET: '{{S3_BUCKET}}',              // 'templatebuilder365-user-data'
  AWS_REGION: '{{AWS_REGION}}',            // 'us-east-1'
  COGNITO_USER_POOL_ID: '{{COGNITO_USER_POOL_ID}}',  // 'us-east-1_RIOPGg1Cq'
  COGNITO_CLIENT_ID: '{{COGNITO_CLIENT_ID}}',         // '2addji24p0obg5sqedgise13i4'
  API_ENDPOINT: '{{API_ENDPOINT}}',        // Lambda API URLs
  ENABLE_AUTH: '{{ENABLE_AUTH}}',          // 'false' for dev, 'true' for stage/prod
  COGNITO_DOMAIN: '{{COGNITO_DOMAIN}}'     // Cognito hosted UI domain
};
```

### Environment Modes

#### Development Mode (`localhost:5174`)
- **Authentication**: Bypassed (demo mode with mock user)
- **File Storage**: Local filesystem with "Save As" dialog
- **Configuration**: `ENVIRONMENT=development`, `ENABLE_AUTH=false`
- **User Experience**: Immediate development without AWS dependencies

#### Stage Mode (CloudFront staging)
- **Authentication**: Real Cognito JWT with staging user pool
- **File Storage**: S3 bucket with `/stage/{user-id}/` prefix
- **Configuration**: `ENVIRONMENT=stage`, `ENABLE_AUTH=true`
- **User Experience**: Full cloud functionality with staging data isolation

#### Production Mode (production domain)
- **Authentication**: Real Cognito JWT with production user pool
- **File Storage**: S3 bucket with `/production/{user-id}/` prefix
- **Configuration**: `ENVIRONMENT=production`, `ENABLE_AUTH=true`
- **User Experience**: Full production cloud functionality

## File Storage Architecture

### Conditional Storage Logic
```typescript
// src/utils/projectFiles.ts
async function saveProject(projectName: string, canvasState: CanvasState) {
  if (CONFIG.ENVIRONMENT === 'development') {
    // Development: Local filesystem or localStorage
    return await saveToLocalStorage(projectName, canvasState);
  } else {
    // Stage/Production: S3 cloud storage with authentication
    const userId = await getCurrentUserId(); // From auth context
    return await s3Client.saveProject(userId, projectName, canvasState);
  }
}
```

### Local Development Storage
- **"Save As" dialog**: Enhanced file picker for folder selection
- **localStorage fallback**: Backup storage method
- **Mock user context**: `dev@templatebuilder365.com` for testing

### Cloud Storage (S3)
- **User isolation**: Files stored in `/{environment}/{user-id}/` folders
- **Project versioning**: Keep last 3 versions with automatic rotation
- **Security**: IAM policies enforce user-specific access

## Authentication Architecture

### Environment-Aware Authentication
```typescript
// src/auth/AuthContext.tsx
function useAuthBasedOnEnvironment() {
  if (CONFIG.ENABLE_AUTH === 'false') {
    // Development mode: Mock authentication
    return {
      isAuthenticated: true,
      user: { id: 'dev-user', email: 'dev@templatebuilder365.com' },
      login: () => Promise.resolve(),
      logout: () => Promise.resolve()
    };
  } else {
    // Stage/Production: Real Cognito authentication
    return useRealCognitoAuth();
  }
}
```

### AWS Cognito Integration
- **OAuth 2.0 PKCE**: Secure authentication flow
- **JWT tokens**: Real user authentication with session persistence
- **User context**: Authenticated user data for S3 operations
- **Security**: HTTPS required for crypto.subtle (PKCE requirement)

## Canvas Coordinate System

### Konva Coordinates
- **Origin**: (0,0) at top-left of canvas
- **Zoom scaling**: Affects positioning calculations
- **Stage position**: Offset must be considered for UI overlays
- **Grid snapping**: Rounds positions to grid boundaries

### Viewport Management
- **Pan and zoom**: Independent viewport control
- **Fit-to-screen**: Auto-calculate zoom to fit canvas in viewport
- **Canvas centering**: Auto-center when canvas smaller than viewport
- **Responsive behavior**: Handles window resize events

## Performance Optimizations

### State Management
- **Zustand**: Lightweight state with minimal re-renders
- **Immer**: Immutable updates with structural sharing
- **Selective updates**: Only changed elements trigger re-renders

### Canvas Rendering
- **Konva.js**: Hardware-accelerated 2D canvas
- **Layer management**: Efficient z-index based rendering
- **Event delegation**: Optimized mouse event handling

### File Operations
- **Client-side processing**: No server dependency for basic operations
- **Lazy loading**: Elements rendered only when visible
- **Memory management**: Automatic cleanup of unused resources

## Adding New Element Types

To add a new element type:

1. **Type Definition** (`src/types/index.ts`):
   - Add to `ElementType` union
   - Extend `TemplateElement` type with new properties

2. **Store Logic** (`src/stores/canvasStore.ts`):
   - Add creation logic in `createDefaultElement` function
   - Handle new element in state management functions

3. **Renderer** (`src/components/Canvas/CanvasElement.tsx`):
   - Implement rendering logic for new element type
   - Add selection handles and interaction behavior

4. **Toolbar** (`src/components/Toolbar/Toolbar.tsx`):
   - Add tool button with icon
   - Include in keyboard shortcut handler

5. **Properties Panel** (`src/components/PropertiesPanel/PropertiesPanel.tsx`):
   - Add properties UI for element-specific controls
   - Implement property change handlers