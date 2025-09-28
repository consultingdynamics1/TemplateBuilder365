# TemplateBuilder365 DynamoDB Stack

Dedicated, standalone DynamoDB infrastructure for TemplateBuilder365.

## 🎯 Purpose

This stack provides the unified DynamoDB table that supports:
- **Images**: User image library with metadata and tags
- **Users**: User profiles, preferences, and quotas
- **Projects**: Project metadata and references
- **Admin**: System metrics, feature flags, and audit trails

## 📊 Table Schema

### Single Table Design
- **Table Name**: `TemplateBuilder365-Data-{stage}`
- **Primary Key**: `PK` (Partition) + `SK` (Sort)
- **Billing**: Pay-per-request (cost-effective)
- **Recovery**: Point-in-time recovery enabled

### Global Secondary Indexes
1. **TagSearchIndex** (GSI1) - Image and project tag search
2. **EntityTypeIndex** (GSI2) - User and entity type queries
3. **SystemIndex** (GSI3) - Admin and system-wide analytics

## 🚀 Deployment Commands

### Deploy
```bash
# Deploy to stage (default)
npm run deploy

# Deploy to specific stage
npm run deploy:stage
npm run deploy:prod

# Check deployment status
npm run info
```

### Remove
```bash
# Remove from stage
npm run remove:stage

# Remove from production
npm run remove:prod
```

### Verify
```bash
# Check configuration
npm run print

# Verify table exists
aws dynamodb describe-table --table-name TemplateBuilder365-Data-stage --region us-east-1
```

## 🔄 Repeatable Process

1. **Deploy**: `npm run deploy:stage`
2. **Verify**: Check AWS console or CLI
3. **Test**: Run application tests
4. **Remove** (if needed): `npm run remove:stage`
5. **Redeploy**: `npm run deploy:stage`

## 📋 Entity Examples

### User Profile
```json
{
  "PK": "USER#user123",
  "SK": "PROFILE",
  "entityType": "UserProfile",
  "email": "user@example.com",
  "subscription": "free",
  "quotas": { "maxImages": 50, "maxStorageMB": 100 }
}
```

### Image Metadata
```json
{
  "PK": "USER#user123",
  "SK": "IMAGE#img_abc123",
  "entityType": "ImageMetadata",
  "filename": "logo.png",
  "tags": { "predefined": ["logo", "branding"], "custom": ["company"] },
  "GSI1PK": "IMAGE_TAG#logo",
  "GSI1SK": "USER#user123#IMAGE#img_abc123"
}
```

### Project Metadata
```json
{
  "PK": "USER#user123",
  "SK": "PROJECT#proj_def456",
  "entityType": "ProjectMetadata",
  "projectName": "Real Estate Flyer",
  "imagesUsed": ["img_abc123"],
  "GSI1PK": "PROJECT_TAG#real-estate",
  "GSI1SK": "USER#user123#PROJECT#proj_def456"
}
```

## 🔗 Integration

Other services can reference this table using CloudFormation exports:
- `TemplateBuilder365-Table-{stage}` - Table name
- `TemplateBuilder365-TableArn-{stage}` - Table ARN
- `TemplateBuilder365-TagSearchIndex-{stage}` - GSI1 name

## 🛡️ Security

- **User Isolation**: All data partitioned by user ID
- **IAM Policies**: Restrict access to user-specific partitions
- **Encryption**: AWS managed encryption at rest
- **Backup**: Point-in-time recovery for data protection