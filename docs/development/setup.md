# Development Setup & Workflows

## Quick Start

### Prerequisites
- Node.js 18+
- Git
- AWS CLI (for deployment)

### Initial Setup
1. **Clone Repository**:
   ```bash
   git clone https://github.com/consultingdynamics1/TemplateBuilder365.git
   cd TemplateBuilder365
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   cd integration-api
   npm install
   cd ..
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5174`

## Development Environment

### 🎉 **DEVELOPMENT WORKING**
- **Authentication**: Bypassed in development mode (mock user: `dev@templatebuilder365.com`)
- **File Storage**: Enhanced with "Save As" dialog for folder selection
- **Canvas**: A4 default size (794×1123px) for professional documents
- **New Document**: Clear canvas button with confirmation dialog
- **Configuration**: `ENVIRONMENT=development`, `ENABLE_AUTH=false`

### Mock Authentication
Development mode uses mock user context:
```typescript
// Mock user for development
{
  id: 'dev-user',
  email: 'dev@templatebuilder365.com',
  isAuthenticated: true
}
```

### Local File Storage
Enhanced file operations in development:
- **"Save As" Dialog**: Choose folder and filename
- **localStorage Backup**: Quick access to recent projects
- **Template Restoration**: `npm run restore` to reset template placeholders

## Available Scripts

### Frontend Development
```bash
npm run dev        # Start development server (port 5174)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm run restore    # Restore template placeholders from backup
```

### Environment-Specific Builds
```bash
npm run build:stage    # Build for stage deployment
npm run build:prod     # Build for production deployment
npm run deploy:stage   # Deploy to S3 stage bucket
npm run deploy:prod    # Deploy to S3 production bucket
```

### Integration API Development
```bash
cd integration-api

# Testing
npm run test:pipeline      # Complete pipeline test
npm run test:end-to-end    # TB365 → HTML → Variables
npm run test:variables     # Variable replacement only
npm run test:renderer      # PNG generation test
npm run test:production    # Security and validation tests

# Deployment
npm run deploy:dev         # Deploy with JWT authentication
npm run deploy:prod        # Deploy to production
npm run invoke:local       # Local Lambda testing
```

## Development Workflow

### 1. Hot Module Replacement (HMR)
- Vite provides instant updates during development
- React Fast Refresh for component updates
- TypeScript compilation in real-time

### 2. Code Quality
- **ESLint**: Configured with React Hooks and React Refresh plugins
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **File watching**: Automatic builds on file changes

### 3. State Management Development
The application uses Zustand with Immer:
- Browser Redux DevTools integration
- Time-travel debugging
- State persistence during HMR

### 4. Canvas Development
- Konva.js development tools
- Element inspection and debugging
- Performance monitoring for rendering

## File Structure

### Frontend (`src/`)
```
src/
├── components/
│   ├── Canvas/           # Konva.js canvas components
│   ├── PropertiesPanel/  # Element property editor
│   ├── SaveDialog/       # File save dialog
│   └── Toolbar/          # Main toolbar
├── stores/
│   └── canvasStore.ts    # Zustand state management
├── types/
│   └── index.ts          # TypeScript definitions
├── utils/
│   ├── projectFiles.ts   # File operations
│   └── s3Client.ts       # S3 integration (staged)
├── auth/
│   ├── AuthContext.tsx   # Authentication logic
│   └── LoginScreen.tsx   # Login interface
├── config/
│   └── environment.ts    # Environment configuration
├── App.tsx               # Root component
└── main.tsx              # Entry point
```

### Backend (`integration-api/`)
```
integration-api/
├── functions/
│   └── tb365-converter.js  # Lambda handler
├── services/
│   ├── tb365-parser.js     # Format validation
│   ├── html-generator.js   # HTML generation
│   ├── variable-replacer.js # Variable replacement
│   └── renderer.js         # PDF/PNG generation
├── utils/
│   ├── validation.js       # Input validation
│   ├── s3-client.js       # S3 utilities
│   └── response-helper.js  # Lambda responses
└── serverless.yml          # AWS deployment config
```

## Environment Configuration

### Variable Replacement System
Source code uses `{{VARIABLE}}` placeholders replaced during build:

```typescript
// src/config/environment.ts
export const CONFIG = {
  ENVIRONMENT: '{{ENVIRONMENT}}',
  ENABLE_AUTH: '{{ENABLE_AUTH}}',
  S3_BUCKET: '{{S3_BUCKET}}',
  COGNITO_USER_POOL_ID: '{{COGNITO_USER_POOL_ID}}',
  COGNITO_CLIENT_ID: '{{COGNITO_CLIENT_ID}}',
  API_ENDPOINT: '{{API_ENDPOINT}}',
  AWS_REGION: '{{AWS_REGION}}',
  COGNITO_DOMAIN: '{{COGNITO_DOMAIN}}'
};
```

### Build Scripts (`scripts/replace-variables.js`)
Replaces placeholders with environment-specific values:
```bash
node scripts/replace-variables.js development  # For development
node scripts/replace-variables.js stage        # For stage
node scripts/replace-variables.js production   # For production
```

## Testing

### Frontend Testing
- **Manual Testing**: Use development server for interactive testing
- **TypeScript Validation**: `tsc -b` for type checking
- **ESLint**: `npm run lint` for code quality
- **Build Testing**: `npm run build` to verify production builds

### Backend Testing
- **Unit Tests**: Individual service testing
- **Integration Tests**: Complete pipeline testing
- **Performance Tests**: Load and timing tests
- **Security Tests**: Validation and XSS protection

### Test Output
```
integration-api/test-output/
├── 2025-09-16_14-30-15/
│   ├── input-tb365.json     # Test input
│   ├── template.html        # Generated HTML
│   ├── final.html          # With variables replaced
│   ├── output.png          # Screenshot
│   └── metadata.json       # Performance metrics
```

## Debugging

### Frontend Debugging
- **Browser DevTools**: React components and state inspection
- **Zustand DevTools**: State management debugging
- **Konva Inspector**: Canvas element debugging
- **Network Tab**: API request monitoring

### Backend Debugging
- **Local Lambda**: `npm run invoke:local` for local testing
- **CloudWatch Logs**: AWS Lambda logging
- **Performance Metrics**: Stage-by-stage timing
- **Error Tracking**: Comprehensive error reporting

### Common Debug Scenarios

#### Canvas Issues
- Check Konva stage size and positioning
- Verify element z-index and visibility
- Monitor performance with large element counts

#### State Issues
- Use Zustand DevTools for state inspection
- Check Immer draft modifications
- Verify action dispatching

#### File Issues
- Check browser localStorage for saved projects
- Verify file format compatibility (.tb365)
- Test "Save As" dialog functionality

## Performance Optimization

### Development Performance
- **HMR Optimization**: Fast refresh for component changes
- **TypeScript Incremental**: Faster compilation
- **Bundle Analysis**: `npm run build` with size analysis

### Runtime Performance
- **Canvas Optimization**: Efficient Konva.js usage
- **State Updates**: Minimal re-renders with Zustand
- **Memory Management**: Cleanup of unused elements

## Adding New Features

### New Element Types
1. **Type Definition** (`src/types/index.ts`):
   - Add to `ElementType` union
   - Extend `TemplateElement` interface

2. **Store Integration** (`src/stores/canvasStore.ts`):
   - Add creation logic in `createDefaultElement`
   - Handle new element in actions

3. **Canvas Rendering** (`src/components/Canvas/CanvasElement.tsx`):
   - Implement rendering for new element type
   - Add selection and interaction behavior

4. **Toolbar Integration** (`src/components/Toolbar/Toolbar.tsx`):
   - Add tool button and icon
   - Include in keyboard shortcuts

5. **Properties Panel** (`src/components/PropertiesPanel/PropertiesPanel.tsx`):
   - Add properties UI for new element
   - Implement property change handlers

### New Canvas Features
1. **Store Actions**: Add new actions to `canvasStore.ts`
2. **UI Controls**: Add controls to toolbar or properties panel
3. **Event Handling**: Implement mouse/keyboard interactions
4. **Persistence**: Ensure new features save/load correctly

## Troubleshooting

### Common Development Issues

#### Server Won't Start
- Check Node.js version (18+ required)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check port availability (5174)

#### TypeScript Errors
- Run `tsc -b` for full type checking
- Check import paths and module resolution
- Verify type definitions in `src/types/index.ts`

#### Canvas Not Rendering
- Check Konva.js version compatibility
- Verify stage size and container mounting
- Check console for canvas-related errors

#### File Operations Failing
- Check localStorage availability
- Verify "Save As" dialog permissions
- Test file format compatibility

### Getting Help
- Check browser console for error messages
- Review component props and state
- Use React DevTools for component inspection
- Check network tab for API issues