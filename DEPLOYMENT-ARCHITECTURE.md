# DEPLOYMENT ARCHITECTURE - NAMING ISSUE DOCUMENTED

## 🎯 CORRECT ARCHITECTURE

### **LOCAL DEVELOPMENT**
- **Purpose**: Local development, no AWS
- **Frontend**: `npm run dev` (runs on localhost:5174)
- **Backend**: Mock servers, local testing
- **Storage**: localStorage, no cloud
- **Status**: ✅ Working correctly

### **STAGE DEPLOYMENT (Cloud Development)**
- **Purpose**: Cloud-based development environment
- **Frontend**: `npm run deploy:stage` → `s3://tb365-frontend-stage/`
- **Backend**: `npm run deploy:dev` → AWS Lambda + API Gateway ⚠️ **NAMING MISMATCH**
- **Storage**: AWS S3 buckets with mixed naming
- **Status**: ✅ Working but confusing naming

### **PRODUCTION DEPLOYMENT**
- **Purpose**: Live production environment
- **Frontend**: `npm run deploy:prod` → `s3://tb365-frontend-prod/`
- **Backend**: `npm run deploy:prod` → AWS Lambda + API Gateway
- **Storage**: AWS S3 production buckets
- **Status**: 🔄 To be tested

## 🚨 NAMING ISSUES TO FIX LATER

### **Current Inconsistency:**
```
STAGE (Cloud Dev):
├── Frontend: deploy:stage → s3://tb365-frontend-stage/ ✅ Correct
└── Backend: deploy:dev → Lambda + s3://tb365-designs-dev/ ❌ Should be "stage"
```

### **Should Be:**
```
STAGE (Cloud Dev):
├── Frontend: deploy:stage → s3://tb365-frontend-stage/ ✅
└── Backend: deploy:stage → Lambda + s3://tb365-designs-stage/ 🎯 Target fix
```

## 📋 ACTION PLAN

### **Phase 1: Verify Current Pipeline** ✅
1. ✅ Local dev working
2. ✅ Frontend stage deployment working
3. 🔄 Test backend "dev" deployment (which is actually stage)
4. 🔄 Verify full integration works

### **Phase 2: Fix Naming (Later)**
1. Create proper `deploy:stage` script for backend
2. Create S3 buckets with consistent "stage" naming
3. Update serverless.yml environment variables
4. Migrate data if needed
5. Update documentation

## 💡 CURRENT WORKAROUND
- **For now**: Use `deploy:dev` for backend knowing it's actually the stage environment
- **Remember**: "dev" backend deployment = stage environment (confusing but functional)
- **Goal**: Get pipeline working first, fix naming second

---
*This document tracks the deployment architecture confusion until we can implement proper naming conventions.*