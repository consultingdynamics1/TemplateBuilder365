# AWS Lambda + API Gateway Deployment Guide

## 🎯 Manual Deployment Steps

Since Serverless Framework requires licensing, we'll deploy directly through AWS Console.

### 📦 **Step 1: Prepare Lambda Code**

**Files ready in `/deploy` folder:**
- `functions/project-manager.js` - Main Lambda handler
- `utils/s3-client.js` - S3 integration utilities
- `utils/response-helper.js` - HTTP response formatting
- `package.json` + `node_modules/` - Dependencies

**Compress into ZIP:**
1. Open File Explorer → `C:\TemplateBuilder365\integration-api\deploy`
2. Select all files and folders
3. Right-click → "Send to" → "Compressed (zipped) folder"
4. Name it `tb365-project-manager.zip`

### 🚀 **Step 2: Create Lambda Function**

**AWS Console → Lambda → Create Function:**

```
Function name: tb365-project-manager-stage
Runtime: Node.js 18.x
Architecture: x86_64
Execution role: Create new role with basic Lambda permissions
```

**Upload Code:**
1. Click "Upload from" → ".zip file"
2. Select `tb365-project-manager.zip`
3. Handler: `functions/project-manager.handler`

**Configuration:**
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Environment Variables:**
  ```
  STAGE=stage
  REGION=us-east-1
  COGNITO_USER_POOL_ID=us-east-1_RIOPGg1Cq
  COGNITO_CLIENT_ID=2addji24p0obg5sqedgise13i4
  ```

**IAM Permissions (attach to execution role):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::templatebuilder365-user-data",
        "arn:aws:s3:::templatebuilder365-user-data/*"
      ]
    }
  ]
}
```

### 🌐 **Step 3: Create API Gateway**

**AWS Console → API Gateway → Create API → HTTP API:**

```
API name: tb365-stage-api
Description: TemplateBuilder365 Project Management API
```

**Add Routes:**
1. `POST /api/projects/save`
2. `GET /api/projects/list`
3. `GET /api/projects/load/{name}`
4. `DELETE /api/projects/{name}`
5. `GET /api/projects/health`

**For Each Route:**
- **Integration**: Lambda function
- **Lambda function**: `tb365-project-manager-stage`
- **Payload format version**: 2.0

### 🔐 **Step 4: Add JWT Authorization**

**Create Authorizer:**
```
Name: CognitoJWTAuthorizer
Type: JWT
Issuer URL: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RIOPGg1Cq
Audience: 2addji24p0obg5sqedgise13i4
```

**Attach to Routes:** (All except `/health`)
- Authorization: CognitoJWTAuthorizer
- Authorization scopes: (leave empty)

### 🌍 **Step 5: Enable CORS**

**For each route → CORS:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Allow-Methods: GET,POST,DELETE,OPTIONS
```

### ✅ **Step 6: Deploy & Test**

**Deploy API:**
- Stage name: `stage`
- Auto-deploy: Enabled

**Note the Invoke URL:**
`https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/stage`

---

## 🧪 **Test Harness Script**

Once deployed, we'll create a test script that:
1. Prompts for email/password
2. Gets JWT token from Cognito
3. Calls each API endpoint
4. Validates responses

**Then update frontend:**
```typescript
// src/config/environment.ts (after build:stage)
API_ENDPOINT: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/stage'
```

---

## 📋 **Expected Outcome**

**Working API Endpoints:**
- `POST /api/projects/save` - Save project with JWT auth
- `GET /api/projects/list` - List user projects
- `GET /api/projects/load/{name}` - Load specific project
- `DELETE /api/projects/{name}` - Delete project
- `GET /api/projects/health` - Health check (no auth)

**Integration:** Frontend → API Gateway → Lambda → S3