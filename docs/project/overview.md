# TemplateBuilder365 - Project Overview

## Current Status

**TemplateBuilder365** is a React-based visual template builder application that allows users to create, edit, and manage design templates. It's built with TypeScript, React 19, and Konva.js for 2D canvas rendering, providing a Figma-like design experience in the browser.

### 🎉 **STAGE DEPLOYMENT LIVE & WORKING**
- **Frontend URL**: `https://de1ztc46ci2dy.cloudfront.net/` (CloudFront HTTPS)
- **Authentication**: ✅ Working Cognito JWT with user pool (`us-east-1_RIOPGg1Cq`)
- **Security Context**: ✅ HTTPS enables crypto.subtle for authentication
- **User Experience**: ✅ Complete login/logout flow with real user data

### 📋 **IMPLEMENTATION STATUS**
- ✅ **Development Environment**: Local auth bypass + file downloads working
- ✅ **Stage Authentication**: HTTPS + Cognito OAuth + JWT tokens working
- ⏳ **Stage File Storage**: Needs secure S3 integration (API Gateway + Lambda)
- ⏳ **Production Deployment**: Ready for promotion after S3 integration complete

## Tech Stack

### Frontend
- **React 19.1.1** with TypeScript
- **Vite 7.1.2** - Build tool
- **Konva.js 9.3.22** with react-konva 19.0.7 - 2D canvas rendering
- **Zustand 5.0.8** with Immer - State management
- **ESLint** - Code quality
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

## Available Scripts

```bash
npm run dev        # Start development server on port 5174
npm run build      # Build for production (TypeScript compile + Vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build

# Environment-specific builds
npm run build:stage    # Stage deployment (ready for S3)
npm run build:prod     # Production deployment (ready for S3)
npm run deploy:stage   # Deploy to S3 stage bucket
npm run deploy:prod    # Deploy to S3 production bucket
```

## File Format

Projects are saved as `.tb365` JSON files:

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

## Next Steps

### ⚠️ CURRENT LIMITATION - S3 SECURITY ISSUE
- **Problem**: Direct AWS SDK usage in browser is a security risk
- **Current State**: Save function still uses local file downloads (desktop save dialog)
- **Root Cause**: Browser cannot safely use AWS SDK with user credentials

### 🎯 NEXT PHASE - SECURE S3 INTEGRATION
**Option A: API Gateway + Lambda Proxy (RECOMMENDED)**
- Route S3 operations through serverless Lambda functions
- Use existing JWT authentication at API Gateway level
- Leverage existing integration-api infrastructure
- Secure: No AWS credentials exposed to browser

**Option B: Cognito Identity Pool**
- Create Identity Pool linked to existing User Pool
- Federated credentials for temporary S3 access
- More complex setup but follows AWS best practices

**Option C: Presigned URLs**
- Generate presigned S3 URLs via Lambda
- Direct browser uploads using presigned URLs
- Good performance with maintained security

## Documentation Organization

- **Core Features**: [project/core-features.md](core-features.md)
- **Architecture Details**: [project/architecture.md](architecture.md)
- **Backend Systems**: [../backend/](../backend/)
- **Development Guide**: [../development/](../development/)

## Recovery Procedure for New Machines

1. `git clone https://github.com/consultingdynamics1/TemplateBuilder365.git`
2. Configure AWS CLI with credentials for deployment
3. `npm install` in both root and `integration-api/` folders
4. Review this documentation for current status
5. Continue from documented next phase (secure S3 integration)

**✅ RESOURCES ACCESSIBLE FROM ANY MACHINE**:
- S3 buckets: `tb365-frontend-stage`, `templatebuilder365-user-data`
- CloudFront distribution: `E1EAQCARE6J2EM` (`https://de1ztc46ci2dy.cloudfront.net/`)
- Cognito user pool: `us-east-1_RIOPGg1Cq` with app client `2addji24p0obg5sqedgise13i4`