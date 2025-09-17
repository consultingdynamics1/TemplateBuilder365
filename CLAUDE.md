# TemplateBuilder365 - Project Guide

## 🚀 Quick Start
TemplateBuilder365 is a React-based visual template builder with cloud storage, authentication, and versioning. Built with TypeScript, Konva.js, and AWS serverless architecture.

## 📚 Documentation
- **[Project Overview](docs/project/overview.md)** - What is TemplateBuilder365 and core concepts
- **[Core Features](docs/project/core-features.md)** - Element types, canvas features, editing capabilities
- **[Architecture](docs/project/architecture.md)** - Tech stack, component structure, state management

## 🛠️ Development
- **[Setup Guide](docs/development/setup.md)** - Environment setup, dependencies, configuration
- **[Deployment](docs/development/deployment.md)** - Build pipeline, environment management, AWS deployment
- **[Testing](docs/development/testing.md)** - Test strategies, debugging, performance monitoring

## ⚙️ Backend & Infrastructure
- **[Integration API](docs/backend/integration-api.md)** - Lambda functions, serverless architecture, endpoints
- **[Authentication](docs/backend/authentication.md)** - AWS Cognito, JWT tokens, security model
- **[Cloud Storage](docs/backend/cloud-storage.md)** - S3 integration, versioning, file management

## 📈 Current Status
- ✅ **S3 Cloud Storage**: User projects stored with versioning and cleanup
- ✅ **Authentication**: AWS Cognito JWT with development bypass
- ✅ **Load/Save Cycle**: Complete cloud storage integration with version retention
- ✅ **Configuration System**: Environment-aware variable replacement
- ✅ **Deployment Pipeline**: Stage deployment active at CloudFront HTTPS

## 🔧 Development Environment
```bash
npm run dev              # Start development server (localhost:5174)
npm run build:stage      # Build for staging deployment
npm run build:prod       # Build for production deployment
```

## 📋 Environment Configuration
- **Development**: Auth bypass, cloud storage via deployed Lambda
- **Stage**: Real Cognito auth, CloudFront HTTPS, S3 storage
- **Production**: Full auth + security, production endpoints

## 🗂️ Project Structure
```
TemplateBuilder365/
├── src/                 # React frontend application
├── integration-api/     # AWS Lambda serverless functions
├── scripts/            # Build and deployment scripts
├── docs/               # Organized project documentation
└── CLAUDE-ARCHIVE.md   # Complete implementation history
```

## 🔗 Key Resources
- **Frontend**: http://localhost:5174 (development)
- **Stage**: https://de1ztc46ci2dy.cloudfront.net/ (staging)
- **API**: https://jczxdnaz4m.execute-api.us-east-1.amazonaws.com/stage
- **S3 Bucket**: templatebuilder365-user-data

## 📖 Implementation History
For complete implementation details, technical decisions, and step-by-step development history, see [CLAUDE-ARCHIVE.md](CLAUDE-ARCHIVE.md).

---
*This guide provides focused navigation to project documentation. All detailed implementation history and technical specifications are preserved in the archive.*