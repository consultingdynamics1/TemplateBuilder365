# Deployment Guide

## Deployment Overview

TemplateBuilder365 uses a multi-environment deployment strategy with variable replacement for seamless development → staging → production workflow.

## Environment Strategy

### 🎉 **STAGE DEPLOYMENT LIVE & WORKING**
- **Frontend URL**: `https://de1ztc46ci2dy.cloudfront.net/` (CloudFront HTTPS)
- **Authentication**: ✅ Working Cognito JWT with user pool (`us-east-1_RIOPGg1Cq`)
- **Security Context**: ✅ HTTPS enables crypto.subtle for authentication
- **User Experience**: ✅ Complete login/logout flow with real user data

### Current Deployment Status
- ✅ **Development Environment**: Local auth bypass + file downloads working
- ✅ **Stage Authentication**: HTTPS + Cognito OAuth + JWT tokens working
- ⏳ **Stage File Storage**: Needs secure S3 integration (API Gateway + Lambda)
- ⏳ **Production Deployment**: Ready for promotion after S3 integration complete

## Environment Modes

### 1. Development Mode (`localhost:5174`)
- **Authentication**: Bypass Cognito (demo mode with mock user context)
- **File Storage**: Local filesystem operations with "Save As" dialog
- **API Integration**: Direct calls to local integration-api OR mock responses
- **Configuration**: `ENVIRONMENT=development`, `ENABLE_AUTH=false`
- **Commands**: `npm run dev`

### 2. Stage Mode (CloudFront staging)
- **Authentication**: Real Cognito JWT with existing staging user pool
- **File Storage**: S3 bucket with `/stage/{user-id}/` prefix
- **API Integration**: Deployed serverless Lambda with staging endpoints
- **Configuration**: `ENVIRONMENT=stage`, `ENABLE_AUTH=true`
- **Commands**: `npm run build:stage && npm run deploy:stage`

### 3. Production Mode (production domain)
- **Authentication**: Real Cognito JWT with production user pool
- **File Storage**: S3 bucket with `/production/{user-id}/` prefix
- **API Integration**: Deployed serverless Lambda with production endpoints
- **Configuration**: `ENVIRONMENT=production`, `ENABLE_AUTH=true`
- **Commands**: `npm run build:prod && npm run deploy:prod`

## Variable Replacement System

### Configuration Template (`src/config/environment.ts`)
```typescript
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

### Environment-Specific Values

#### Development Configuration
```bash
ENVIRONMENT=development
ENABLE_AUTH=false
S3_BUCKET=local-filesystem
API_ENDPOINT=http://localhost:3000
COGNITO_USER_POOL_ID=mock
COGNITO_CLIENT_ID=mock
AWS_REGION=us-east-1
COGNITO_DOMAIN=mock
```

#### Stage Configuration
```bash
ENVIRONMENT=stage
ENABLE_AUTH=true
S3_BUCKET=templatebuilder365-user-data
API_ENDPOINT=https://api-stage.templatebuilder365.com
COGNITO_USER_POOL_ID=us-east-1_RIOPGg1Cq
COGNITO_CLIENT_ID=2addji24p0obg5sqedgise13i4
AWS_REGION=us-east-1
COGNITO_DOMAIN=us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com
```

#### Production Configuration
```bash
ENVIRONMENT=production
ENABLE_AUTH=true
S3_BUCKET=templatebuilder365-user-data
API_ENDPOINT=https://api.templatebuilder365.com
COGNITO_USER_POOL_ID=us-east-1_RIOPGg1Cq
COGNITO_CLIENT_ID=2addji24p0obg5sqedgise13i4
AWS_REGION=us-east-1
COGNITO_DOMAIN=us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com
```

## Build Pipeline

### Build Scripts (`package.json`)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:stage": "npm run replace:stage && npm run build",
    "build:prod": "npm run replace:prod && npm run build",
    "replace:stage": "node scripts/replace-variables.js stage",
    "replace:prod": "node scripts/replace-variables.js production",
    "deploy:stage": "npm run build:stage && aws s3 sync dist/ s3://tb365-frontend-stage",
    "deploy:prod": "npm run build:prod && aws s3 sync dist/ s3://tb365-frontend-prod"
  }
}
```

### Variable Replacement Script (`scripts/replace-variables.js`)
```javascript
// Reads environment-specific config files
// Replaces all {{VARIABLE}} placeholders in source code
// Creates deployment-ready build in dist/ folder
const environmentConfigs = {
  stage: require('./config/stage.json'),
  production: require('./config/production.json')
};

function replaceVariables(environment) {
  const config = environmentConfigs[environment];
  // Replace all {{VARIABLE}} patterns in source files
  // Write updated files to deployment directory
}
```

### Configuration Files Structure
```
scripts/
├── replace-variables.js      # Variable replacement logic
├── restore-templates.js      # Template restoration utility
└── config/
    ├── stage.json           # Stage environment variables
    ├── production.json      # Production environment variables
    └── development.json     # Development defaults (optional)
```

## AWS Infrastructure

### Frontend Hosting

#### S3 Static Website Buckets
- **Stage**: `tb365-frontend-stage`
  - Website endpoint: `http://tb365-frontend-stage.s3-website-us-east-1.amazonaws.com`
  - CloudFront distribution: `E1EAQCARE6J2EM`
  - HTTPS URL: `https://de1ztc46ci2dy.cloudfront.net/`

- **Production**: `tb365-frontend-prod` (planned)
  - Will use custom domain with SSL certificate
  - CloudFront for HTTPS and global distribution

#### CloudFront Configuration
- **Origin**: S3 static website endpoint (HTTP)
- **SSL**: CloudFront default certificate for HTTPS
- **Caching**: Optimized for static assets
- **CORS**: Configured for authentication requests

### User Data Storage

#### S3 Bucket: `templatebuilder365-user-data`
```
templatebuilder365-user-data/
├── stage/                   # Staging environment data
│   ├── {user-id}/          # User-specific folders
│   │   ├── projects/       # TB365 projects with versioning
│   │   └── exports/        # Generated HTML/PDF/PNG outputs
├── production/             # Production environment data
│   ├── {user-id}/
│   │   ├── projects/
│   │   └── exports/
└── temp/                   # Temporary processing files
```

#### IAM Policies
- User-specific access: `/{environment}/{user-id}/*`
- No cross-user access without explicit sharing
- Environment isolation between stage and production

### Backend API (Integration API)

#### Serverless Lambda Configuration (`integration-api/serverless.yml`)
```yaml
service: tb365-integration-api

provider:
  name: aws
  runtime: nodejs18.x
  timeout: 600  # 10 minutes for Puppeteer
  memorySize: 1024  # 1GB for PDF generation

httpApi:
  authorizers:
    cognitoAuthorizer:
      type: jwt
      identitySource: $request.header.Authorization
      issuerUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RIOPGg1Cq
      audience:
        - 2addji24p0obg5sqedgise13i4

functions:
  tb365Converter:
    handler: functions/tb365-converter.handler
    events:
      - httpApi:
          path: /convert
          method: post
          authorizer: cognitoAuthorizer
```

## Deployment Commands

### Frontend Deployment

#### Stage Deployment
```bash
# Build with stage configuration
npm run build:stage

# Deploy to S3
aws s3 sync dist/ s3://tb365-frontend-stage

# Invalidate CloudFront cache (optional)
aws cloudfront create-invalidation --distribution-id E1EAQCARE6J2EM --paths "/*"
```

#### Production Deployment
```bash
# Build with production configuration
npm run build:prod

# Deploy to S3
aws s3 sync dist/ s3://tb365-frontend-prod

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <PROD_DISTRIBUTION_ID> --paths "/*"
```

### Backend Deployment

#### Integration API Deployment
```bash
cd integration-api

# Deploy to stage
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Local testing
npm run invoke:local
```

## Prerequisites for Deployment

### AWS CLI Setup
1. **Install AWS CLI**: Latest version required
2. **Configure Credentials**:
   ```bash
   aws configure
   # Enter Access Key ID, Secret Access Key, Region (us-east-1)
   ```
3. **Verify Access**:
   ```bash
   aws s3 ls  # Should list buckets
   aws sts get-caller-identity  # Should show user info
   ```

### Required AWS Resources
- ✅ S3 bucket: `tb365-frontend-stage` (static website hosting)
- ✅ S3 bucket: `templatebuilder365-user-data` (user data storage)
- ✅ CloudFront distribution: `E1EAQCARE6J2EM` (HTTPS)
- ✅ Cognito User Pool: `us-east-1_RIOPGg1Cq` (authentication)
- ✅ Cognito App Client: `2addji24p0obg5sqedgise13i4` (OAuth)

### Missing Resources for Production
- ⏳ S3 bucket: `tb365-frontend-prod`
- ⏳ CloudFront distribution for production
- ⏳ Custom domain configuration (optional)
- ⏳ Production Cognito user pool (or reuse staging)

## Multi-Computer Development Setup

### New Machine Setup
When adding additional development machines:

1. **Git Clone**:
   ```bash
   git clone https://github.com/consultingdynamics1/TemplateBuilder365.git
   ```

2. **AWS CLI Setup**: Configure AWS credentials
   - **Option A**: Use existing access key from another machine
   - **Option B**: Create new AWS access key for new machine
   - **Option C**: Use AWS SSO/named profiles

3. **Dependencies**:
   ```bash
   npm install
   cd integration-api && npm install
   ```

4. **Development**:
   ```bash
   npm run dev  # Start local development
   ```

### AWS Credential Options

#### Option A: Locate Existing Credentials
- Check current machine: `~/.aws/credentials` or `~/.aws/config`
- Copy same access key to new computer for consistency
- Use `aws configure` to set up on new machine

#### Option B: Create New AWS Access Key (RECOMMENDED)
- AWS Console → IAM → Users → `templatestudio365` → Security credentials
- Create new access key for CLI usage on new computer
- Configure via `aws configure` with new credentials
- Keep both keys active (one per machine) for better organization

#### Option C: AWS SSO/Named Profiles
- Set up named profiles for different machines
- Each computer gets its own credential set and profile name
- Better security and organization for multi-machine development

## Monitoring and Troubleshooting

### Deployment Verification

#### Frontend Verification
1. **Stage URL**: Visit `https://de1ztc46ci2dy.cloudfront.net/`
2. **Authentication**: Test login/logout flow
3. **File Operations**: Test save/load functionality
4. **Console Check**: No JavaScript errors in browser console

#### Backend Verification
1. **Lambda Logs**: Check CloudWatch logs for errors
2. **API Testing**: Test conversion endpoints
3. **Authentication**: Verify JWT validation
4. **Performance**: Monitor execution time and memory usage

### Common Deployment Issues

#### Build Failures
- **TypeScript Errors**: Run `tsc -b` to check types
- **Environment Variables**: Verify all `{{VARIABLES}}` are replaced
- **Dependencies**: Ensure all npm packages are installed

#### AWS Access Issues
- **Credentials**: Check `aws sts get-caller-identity`
- **Permissions**: Verify S3 bucket access
- **Region**: Ensure correct AWS region (us-east-1)

#### Authentication Issues
- **HTTPS**: Ensure HTTPS for crypto.subtle availability
- **Callback URLs**: Verify Cognito client configuration
- **Scopes**: Check OAuth scopes include "email openid profile"

### Recovery Procedures

#### Complete Environment Recovery
1. **Git Clone**: Fresh repository clone
2. **AWS Resources**: Verify all buckets and services exist
3. **Dependencies**: `npm install` in both root and integration-api
4. **Configuration**: Check environment variable replacement
5. **Deploy**: Follow standard deployment process

#### Partial Recovery
- **Frontend Only**: `npm run deploy:stage` or `npm run deploy:prod`
- **Backend Only**: `cd integration-api && npm run deploy:dev`
- **Configuration Fix**: `npm run replace:stage && npm run build`

All AWS resources (S3 buckets, CloudFront, Cognito) work from any computer with proper CLI credentials configured.