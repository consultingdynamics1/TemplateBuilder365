# Cloud Storage Integration

## Current Status

**Implementation Status**: ✅ **AUTHENTICATION COMPLETE** → ⏳ **S3 INTEGRATION NEXT**

### Current File Storage
- **Method**: Browser downloads (.tb365 files) + localStorage simulation
- **Location**: User's local device only
- **Limitations**: No cloud backup, no cross-device access
- **Code**: `src/utils/projectFiles.ts` handles local file operations

### Next Phase: Secure S3 Integration
Direct S3 integration from React frontend using existing Cognito authentication for secure cloud file storage.

## S3 Bucket Architecture

### Bucket Structure
```
templatebuilder365-user-data/
├── stage/                      # Staging environment
│   ├── {user-id}/             # Cognito user.sub ID
│   │   ├── projects/          # TB365 design projects
│   │   │   ├── real-estate-flyer/
│   │   │   │   ├── current.json      # Version pointer + metadata
│   │   │   │   ├── v6/
│   │   │   │   │   └── template.tb365
│   │   │   │   ├── v7/
│   │   │   │   │   └── template.tb365
│   │   │   │   └── v8/
│   │   │   │       └── template.tb365
│   │   │   └── business-card/
│   │   │       ├── current.json
│   │   │       └── v3/
│   │   │           └── template.tb365
│   │   └── exports/           # Generated outputs (no versioning)
│   │       ├── real-estate-flyer.html
│   │       ├── real-estate-flyer.pdf
│   │       ├── real-estate-flyer.png
│   │       ├── business-card.html
│   │       ├── business-card.pdf
│   │       └── business-card.png
│   └── temp/                  # Temporary processing
│       └── conversions/
├── production/                 # Production environment
│   ├── {user-id}/
│   │   ├── projects/
│   │   └── exports/
│   └── temp/
└── development/                # Optional: Local dev testing
```

## Project Versioning System

### Version Management Strategy
- **Balanced Approach**: Simple customer UI with version safety
- **current.json**: Points to active version with metadata
- **Version Folders**: Keep last 3 versions (v6, v7, v8) with automatic rotation
- **Export Strategy**: Single export per project (no version numbers) - always overwrites
- **Rollback Protection**: User warned when saving from older version, creates new version preserving history

### current.json Structure
```json
{
  "version": "v8",
  "lastSaved": "2025-09-16T14:30:00Z",
  "restoredFrom": null,
  "metadata": {
    "projectName": "Real Estate Flyer",
    "canvasSize": { "width": 794, "height": 1123 },
    "elementCount": 7,
    "lastModified": "2025-09-16T14:30:00Z"
  }
}
```

### Version Cleanup Logic
```typescript
// Auto-cleanup keeps last 3 versions
const versionsToKeep = 3;
const existingVersions = await listProjectVersions(userId, projectName);
const versionsToDelete = existingVersions.slice(versionsToKeep);
await Promise.all(versionsToDelete.map(v => deleteVersion(v)));
```

## Security Model

### User Access Control
- Users access only their own `/{environment}/{user-id}/` folder
- Cognito JWT provides user identity and environment access
- IAM policies enforce user-specific and environment-specific permissions
- No cross-user access without explicit sharing

### IAM Policy Structure
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::templatebuilder365-user-data/${cognito-identity.amazonaws.com:sub}/*"
      ],
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "us-east-1_RIOPGg1Cq"
        }
      }
    }
  ]
}
```

## Implementation Plan

### Phase 1: S3 Client Integration
✅ **Current Status**: S3 client utilities implemented (`src/utils/s3Client.ts`)

```typescript
// S3 client with user isolation and versioning
export class S3ProjectClient {
  async saveProject(userId: string, projectName: string, canvasState: CanvasState) {
    // 1. Generate new version number
    // 2. Save project to versioned folder
    // 3. Update current.json pointer
    // 4. Clean up old versions (keep last 3)
  }

  async loadProject(userId: string, projectName: string) {
    // 1. Read current.json for active version
    // 2. Load project from versioned folder
    // 3. Return project data with version metadata
  }

  async listProjects(userId: string) {
    // 1. List all project folders for user
    // 2. Read current.json for each project
    // 3. Return project list with metadata
  }
}
```

### Phase 2: Authentication Integration
✅ **Current Status**: Cognito authentication working

The existing JWT authentication provides user context for S3 operations:
- User ID from `user.sub` claim in JWT
- Environment from configuration (`stage`, `production`)
- Secure token storage in localStorage

### Phase 3: Conditional Storage Logic
✅ **Current Status**: Environment-aware storage implemented

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

## Current Blocker: Browser S3 Authentication

### ⚠️ Security Issue
- **Problem**: Direct AWS SDK usage in browser is a security risk
- **Current State**: Save function falls back to local file downloads
- **Root Cause**: Browser cannot safely use AWS SDK with user credentials

### Solution Options

#### Option A: API Gateway + Lambda Proxy (RECOMMENDED)
- **Approach**: Route S3 operations through serverless Lambda functions
- **Security**: Use existing JWT authentication at API Gateway level
- **Infrastructure**: Leverage existing integration-api infrastructure
- **Benefits**: No AWS credentials exposed to browser

**Implementation**:
```typescript
// Frontend calls Lambda instead of direct S3
const response = await fetch('/api/projects/save', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ projectName, canvasState })
});
```

#### Option B: Cognito Identity Pool
- **Approach**: Create Identity Pool linked to existing User Pool
- **Security**: Federated credentials for temporary S3 access
- **Benefits**: Follows AWS best practices
- **Complexity**: More setup required, additional AWS resources

#### Option C: Presigned URLs
- **Approach**: Generate presigned S3 URLs via Lambda
- **Security**: Direct browser uploads using presigned URLs
- **Benefits**: Good performance with maintained security
- **Limitations**: Complex for file listing and management operations

## Deployment Pipeline Strategy

### Variable Replacement System
Source code uses `{{ENVIRONMENT}}`, `{{S3_BUCKET}}`, etc. that get replaced during build/deployment pipeline.

**Environment-Specific Values**:
```bash
# Development
ENVIRONMENT=development
ENABLE_AUTH=false
S3_BUCKET=local-filesystem

# Stage
ENVIRONMENT=stage
ENABLE_AUTH=true
S3_BUCKET=templatebuilder365-user-data

# Production
ENVIRONMENT=production
ENABLE_AUTH=true
S3_BUCKET=templatebuilder365-user-data
```

### Build Pipeline
```json
{
  "scripts": {
    "build:stage": "npm run replace:stage && npm run build",
    "build:prod": "npm run replace:prod && npm run build",
    "replace:stage": "node scripts/replace-variables.js stage",
    "replace:prod": "node scripts/replace-variables.js production",
    "deploy:stage": "npm run build:stage && aws s3 sync dist/ s3://tb365-frontend-stage",
    "deploy:prod": "npm run build:prod && aws s3 sync dist/ s3://tb365-frontend-prod"
  }
}
```

## Current Deployment Status

### ✅ Stage Deployment Live
- **Frontend URL**: `https://de1ztc46ci2dy.cloudfront.net/` (CloudFront HTTPS)
- **S3 Origin**: `tb365-frontend-stage` bucket
- **User Data Bucket**: `templatebuilder365-user-data` (ready for integration)
- **Authentication**: Working Cognito JWT with user pool
- **Security Context**: HTTPS enables crypto.subtle for authentication

### ⏳ Production Deployment
Ready for promotion after S3 integration complete.

## File Operation Flow

### Current Flow (Development)
1. User clicks "Save"
2. Enhanced "Save As" dialog opens
3. User selects folder and filename
4. File downloads to selected location
5. localStorage backup for quick access

### Planned Flow (Stage/Production)
1. User clicks "Save"
2. Authentication check (redirect to login if needed)
3. S3 save operation via secure API
4. Version management and cleanup
5. Success confirmation with cloud sync indicator

### Fallback Strategy
If S3 operations fail:
1. Display user-friendly error message
2. Offer local download as backup
3. Store in localStorage for retry later
4. Log error for debugging

## Testing Strategy

### Development Testing
- **Local Storage**: Test "Save As" dialog and localStorage backup
- **Mock Authentication**: Verify auth bypass works correctly
- **File Operations**: Ensure TB365 format compatibility

### Stage Testing
- **S3 Integration**: Test full cloud save/load cycle
- **Authentication Flow**: Verify JWT → S3 user isolation
- **Version Management**: Test version rotation and cleanup
- **Error Handling**: Test network failures and fallbacks

### Production Testing
- **Full Stack**: Test complete authentication → S3 → versioning flow
- **Cross-Device**: Verify projects sync across devices
- **Performance**: Measure save/load times vs local storage
- **Security**: Verify user isolation and access controls

## Recovery & Continuity

### Critical Files for S3 Integration
- `src/utils/s3Client.ts` - S3 integration utilities
- `src/utils/projectFiles.ts` - File storage abstraction
- `src/auth/AuthContext.tsx` - User authentication context
- `integration-api/utils/s3-client.js` - Server-side S3 utilities

### Recovery Procedure
1. Review current implementation status in this documentation
2. Check existing S3 client utilities for browser compatibility
3. Implement chosen solution (API Gateway + Lambda recommended)
4. Test authentication → S3 flow in stage environment
5. Deploy to production when stage testing complete

### Next Implementation Session
1. ⏳ Implement Option A (API Gateway + Lambda proxy for S3 operations)
2. ⏳ Create Lambda endpoints for save/load/list operations
3. ⏳ Update frontend to call Lambda instead of direct S3
4. ⏳ Test full authentication → cloud storage flow
5. ⏳ Deploy to production when testing complete