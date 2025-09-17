# TemplateBuilder365 - Project Guide

## 📚 Documentation Structure

This project documentation has been organized into focused sections for better navigation and performance:

### 📋 Project Overview
- **[docs/project/overview.md](docs/project/overview.md)** - Current status, tech stack, quick reference
- **[docs/project/core-features.md](docs/project/core-features.md)** - Canvas, elements, tools, file format
- **[docs/project/architecture.md](docs/project/architecture.md)** - State management, components, environment config

### 🔧 Backend Systems
- **[docs/backend/integration-api.md](docs/backend/integration-api.md)** - Complete serverless Lambda API system
- **[docs/backend/authentication.md](docs/backend/authentication.md)** - AWS Cognito JWT implementation
- **[docs/backend/cloud-storage.md](docs/backend/cloud-storage.md)** - S3 integration and deployment pipeline

### 🚀 Development
- **[docs/development/setup.md](docs/development/setup.md)** - Local development, scripts, testing
- **[docs/development/deployment.md](docs/development/deployment.md)** - Environment strategy, build pipeline
- **[docs/development/testing.md](docs/development/testing.md)** - Testing approaches and performance metrics

### 🎯 Quick Navigation
- **[docs/README.md](docs/README.md)** - Complete navigation guide with quick start links

---

## 🎉 Current Status

**TemplateBuilder365** is a React-based visual template builder providing a Figma-like design experience in the browser.

### ✅ **STAGE DEPLOYMENT LIVE & WORKING**
- **Frontend URL**: `https://de1ztc46ci2dy.cloudfront.net/` (CloudFront HTTPS)
- **Authentication**: Working Cognito JWT with user pool (`us-east-1_RIOPGg1Cq`)
- **User Experience**: Complete login/logout flow with real user data

### 📋 **IMPLEMENTATION STATUS**
- ✅ **Development Environment**: Local auth bypass + file downloads working
- ✅ **Stage Authentication**: HTTPS + Cognito OAuth + JWT tokens working
- ⏳ **Stage File Storage**: Needs secure S3 integration (API Gateway + Lambda)
- ⏳ **Production Deployment**: Ready for promotion after S3 integration complete

## 🚀 Quick Start

### Development
```bash
git clone https://github.com/consultingdynamics1/TemplateBuilder365.git
cd TemplateBuilder365
npm install
npm run dev  # Start on localhost:5174
```

### Environment-Specific Builds
```bash
npm run build:stage    # Build for stage deployment
npm run build:prod     # Build for production deployment
npm run deploy:stage   # Deploy to S3 stage bucket
npm run deploy:prod    # Deploy to S3 production bucket
```

## 🎯 Next Phase: Secure S3 Integration

### Current Limitation
- **Problem**: Direct AWS SDK usage in browser is a security risk
- **Current State**: Save function uses local file downloads
- **Solution Needed**: API Gateway + Lambda proxy for S3 operations

### Recommended Implementation
**Option A: API Gateway + Lambda Proxy**
- Route S3 operations through serverless Lambda functions
- Use existing JWT authentication at API Gateway level
- Leverage existing integration-api infrastructure
- Secure: No AWS credentials exposed to browser

## 💾 Recovery for New Machines

1. **Git Clone**: Repository contains complete project state
2. **AWS Setup**: Configure AWS CLI credentials for deployment
3. **Dependencies**: `npm install` in both root and `integration-api/` folders
4. **Documentation**: Read [docs/README.md](docs/README.md) for current status
5. **Continue Development**: Pick up from documented next phase

**✅ All AWS resources accessible from any machine with proper CLI credentials**

---

## 📖 Legacy Reference

This main CLAUDE.md file previously contained all documentation (~1,300 lines). The content has been reorganized into focused documentation files for better performance and maintainability while preserving all implementation details and current status.

For the complete documentation, please visit [docs/README.md](docs/README.md).