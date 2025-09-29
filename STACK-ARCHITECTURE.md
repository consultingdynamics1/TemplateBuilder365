# TemplateBuilder365 Stack Architecture

## 🏗️ Multi-Stack Deployment Strategy

### Stack Separation Rationale
- **Independent Deployment**: Each stack can be deployed/updated without affecting others
- **Isolation**: Failures in one stack don't impact others
- **Scalability**: Different scaling needs per service
- **Maintainability**: Clear separation of concerns

---

## 📊 Current Stack Inventory

### 1. DynamoDB Stack
**Name**: `templatebuilder365-dynamodb-stage`
**Purpose**: Unified data storage infrastructure
**Contains**:
- Single DynamoDB table: `TemplateBuilder365-Data-stage`
- 3 GSI indexes for efficient querying
- CloudFormation exports for other stacks

**Endpoints**: None (infrastructure only)
**Dependencies**: None
**Status**: ✅ Deployed and stable

---

### 2. Image API Stack
**Name**: `tb365-image-api-stage`
**Purpose**: JWT-protected image library management
**Contains**:
- Image upload with S3 presigned URLs
- Image metadata management (tags, search)
- User isolation and authentication

**Endpoints**:
```
POST   /api/images/upload     - Generate presigned upload URL
GET    /api/images            - List user's images
GET    /api/images/{id}       - Get specific image + download URL
PUT    /api/images/{id}       - Update image metadata
DELETE /api/images/{id}       - Delete image from S3 + DynamoDB
GET    /api/images/search     - Search images by tags
GET    /health                - Health check
```

**Dependencies**:
- DynamoDB table (from dynamodb stack)
- S3 bucket: `tb365-designs-stage`
- Cognito User Pool for JWT auth

**Status**: ✅ Deployed and ready
**API Base**: `https://7lr787c2s3.execute-api.us-east-1.amazonaws.com`

---

### 3. Integration API Stack
**Name**: `tb365-integration-api-stage`
**Purpose**: Project management and template conversion
**Contains**:
- Project save/load with S3 versioning
- TB365 to APITemplate.io conversion
- Project listing and management

**Endpoints** (Expected):
```
POST   /api/projects/save     - Save project with versioning
GET    /api/projects/list     - List user projects
GET    /api/projects/load/{name} - Load specific project
DELETE /api/projects/{name}   - Delete project
GET    /api/projects/health   - Health check
POST   /convert               - Convert TB365 → APITemplate
GET    /convert/{id}          - Get conversion result
GET    /health                - General health check
```

**Dependencies**:
- DynamoDB table (from dynamodb stack)
- S3 buckets: `templatebuilder365-user-data`, `tb365-designs-stage`
- Cognito User Pool for JWT auth

**Status**: 🔄 Pending deployment (image endpoints removed)

---

## 🔄 Deployment Order

1. **DynamoDB Stack** (foundation)
2. **Image API Stack** (independent service)
3. **Integration API Stack** (project management)

## 🛡️ Security Architecture

- **JWT Authentication**: All protected endpoints use Cognito authorizer
- **User Isolation**: All data partitioned by user ID
- **S3 Security**: Presigned URLs for secure file operations
- **IAM Roles**: Least privilege access per stack

## 📈 Scaling Strategy

- **Image API**: Independent scaling based on image upload volume
- **Integration API**: Scales with project save/load operations
- **DynamoDB**: Pay-per-request, auto-scales with usage

## 🔧 Maintenance & Troubleshooting

**Independent Updates**:
- Image features → Deploy only `tb365-image-api-stage`
- Project features → Deploy only `tb365-integration-api-stage`
- Database changes → Deploy `templatebuilder365-dynamodb-stage`

**Rollback Strategy**:
- Each stack maintains independent CloudFormation state
- Can rollback individual services without affecting others
- DynamoDB stack should remain stable (data layer)

## 📝 Recreation Commands

```bash
# Deploy all stacks in order
cd dynamodb-stack && npm run deploy:stage
cd ../image-api && npm run deploy:stage
cd ../integration-api && npm run deploy:stage

# Individual stack management
cd dynamodb-stack && npm run deploy:stage    # Infrastructure
cd image-api && npm run deploy:stage         # Image services
cd integration-api && npm run deploy:stage   # Project services

# Remove stacks (reverse order)
cd integration-api && npm run remove:stage
cd ../image-api && npm run remove:stage
cd ../dynamodb-stack && npm run remove:stage
```

---

*Last Updated: 2025-09-28*
*Stack Count: 3 independent deployments*