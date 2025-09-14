# TemplateBuilder365 - AWS Infrastructure Audit

## Overview

This document tracks all AWS CLI commands executed for the TemplateBuilder365 serverless integration system deployment. It serves as a reference for infrastructure setup, debugging, and future maintenance.

**Project**: TB365 Serverless Conversion Pipeline  
**AWS Account**: 510624138860  
**User**: templatestudio365  
**Primary Region**: us-east-1  

---

## Initial Setup & Verification Commands

### AWS CLI Configuration Check
```bash
# Check AWS CLI version and installation
aws --version
# Output: aws-cli/2.28.14 Python/3.13.4 Windows/11 exe/AMD64
# Purpose: Verify AWS CLI is properly installed and up to date
```

```bash
# Verify AWS credentials and account access
aws sts get-caller-identity
# Output: {
#   "UserId": "AIDAXNY4SAZWLO3NVTILK",
#   "Account": "510624138860", 
#   "Arn": "arn:aws:iam::510624138860:user/templatestudio365"
# }
# Purpose: Confirm we have valid AWS credentials and identify the account/user
```

---

## Certificate Management (ACM)

### List SSL Certificates
```bash
# List all SSL certificates in us-east-1 region
aws acm list-certificates --region us-east-1
# Purpose: Discover existing SSL certificates available for HTTPS endpoints
# Found: templatestudio365.com certificate (ISSUED, valid until 2026-09-13)
```

```bash
# List certificates with specific filtering (alternative format)
aws acm list-certificates --region us-east-1 --query 'CertificateSummary[*].{Domain:DomainName,Arn:CertificateArn}' --output table
# Purpose: Display certificates in table format for easier reading
```

```bash
# Search for specific domain certificate
aws acm list-certificates --region us-east-1 --query 'CertificateSummary[?DomainName==`templatestudio365.com`]' --output table
# Purpose: Find certificate for specific domain (templatestudio365.com)
```

### Key Certificate Findings:
- **Domain**: `templatestudio365.com` + `www.templatestudio365.com`
- **ARN**: `arn:aws:acm:us-east-1:510624138860:certificate/9ee56be3-1130-4b21-8248-aa2ec04b6dd4`
- **Status**: ISSUED (valid for production use)
- **Expiry**: 2026-09-13 (auto-renewable)
- **In Use**: Yes (currently used by existing CloudFront distribution)

---

## CloudFront Distribution Analysis

### List All CloudFront Distributions
```bash
# List all CloudFront distributions with key information
aws cloudfront list-distributions --query 'DistributionList.Items[*].{Id:Id,Domain:DomainName,Aliases:Aliases.Items}' --output table
# Purpose: Identify existing CloudFront distributions and their domain aliases
```

### Key CloudFront Findings:
- **Primary Distribution**: `E347F8EWQWIGL1`
  - **Domain**: `d2ygba9bfvbrb.cloudfront.net`
  - **Aliases**: `www.templatestudio365.com`, `templatestudio365.com`
  - **Status**: Active and serving production traffic
  
- **Secondary Distribution**: `E3W0DS3PFYOZUT`
  - **Domain**: `d1j44ainjnbn12.cloudfront.net`
  - **Aliases**: None
  - **Status**: Additional distribution (purpose unclear)

---

## Deployment Strategy Analysis

### Current Infrastructure Assessment

**Existing Resources Available:**
- ✅ **SSL Certificate**: templatestudio365.com (valid until 2026)
- ✅ **CloudFront Distribution**: Active with domain aliases
- ✅ **AWS Account**: Properly configured with IAM user
- ✅ **Region**: us-east-1 (standard for production)

### Deployment Options Identified

#### Option 1: API Gateway Default HTTPS (Recommended for MVP)
```bash
# Commands to deploy (not yet executed):
cd integration-api
export API_KEY="tb365-dev-2025"
npm run deploy:dev
# Purpose: Deploy Lambda function with automatic API Gateway HTTPS
# Result: https://[random-id].execute-api.us-east-1.amazonaws.com/dev/convert
```

**Pros:**
- Zero certificate configuration required
- Immediate deployment possible
- AWS-managed SSL certificates
- No additional costs

**Cons:**
- Generic AWS domain name
- Not branded/custom domain

#### Option 2: Custom Domain Integration (Future Phase)
**Leverages existing templatestudio365.com infrastructure**

**Path A: API Subdomain**
```bash
# Future commands to create custom domain:
aws apigateway create-domain-name --domain-name api.templatestudio365.com --certificate-arn arn:aws:acm:us-east-1:510624138860:certificate/9ee56be3-1130-4b21-8248-aa2ec04b6dd4
# Purpose: Create custom domain for API Gateway using existing certificate
```

**Path B: CloudFront Integration**
```bash
# Future commands to update CloudFront distribution:
aws cloudfront get-distribution-config --id E347F8EWQWIGL1
# Purpose: Get current CloudFront configuration for modification
# Follow-up: Update distribution to route /api/* paths to API Gateway
```

---

## Serverless Framework Integration

### Local Setup Verification
```bash
# Check Serverless Framework version
cd integration-api && npx serverless --version
# Output: Serverless ϟ Framework 4.18.2
# Purpose: Confirm Serverless Framework is properly installed for deployment
```

### Deployment Commands (Ready to Execute)

#### Development Environment
```bash
# Set environment variables
export API_KEY="tb365-dev-2025"
export S3_BUCKET_DEV="tb365-output-dev-510624138860"
export S3_BUCKET_PROD="tb365-output-prod-510624138860"

# Deploy to development stage
cd integration-api
npm run deploy:dev
# Equivalent to: npx serverless deploy --stage dev
# Purpose: Deploy complete TB365 conversion pipeline to AWS Lambda
```

#### Production Environment (Future)
```bash
# Deploy to production stage
npm run deploy:prod
# Equivalent to: npx serverless deploy --stage prod
# Purpose: Deploy to production environment with prod configuration
```

#### Local Testing (Alternative)
```bash
# Test Lambda function locally
npm run invoke:local
# Equivalent to: npx serverless invoke local --function convertTb365ToApiTemplate --path test-event.json
# Purpose: Test Lambda function locally without deploying to AWS
```

---

## Expected AWS Resources After Deployment

### Lambda Function
- **Name**: `tb365-converter-api-dev-convertTb365ToApiTemplate`
- **Runtime**: Node.js 18.x
- **Memory**: 1024MB (for Puppeteer rendering)
- **Timeout**: 600 seconds (10 minutes)
- **Handler**: `functions/tb365-converter.handler`

### API Gateway
- **Type**: REST API
- **Stage**: dev
- **Endpoints**:
  - `POST /convert` - Main conversion endpoint
  - `GET|POST /output-config` - Configuration management
  - `OPTIONS /*` - CORS support

### S3 Buckets (If created)
- **Dev Bucket**: `tb365-output-dev-510624138860`
- **Prod Bucket**: `tb365-output-prod-510624138860`
- **Purpose**: Store generated HTML, PNG, PDF files

### IAM Roles & Policies
- **Lambda Execution Role**: Auto-created by Serverless Framework
- **Permissions**: 
  - CloudWatch Logs (logging)
  - S3 Read/Write (file storage)
  - Basic Lambda execution

---

## Monitoring & Debugging Commands

### CloudWatch Logs
```bash
# View Lambda function logs (after deployment)
aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/tb365-converter-api-dev'
# Purpose: Find log groups for the deployed Lambda function
```

```bash
# Stream real-time logs during testing
aws logs tail /aws/lambda/tb365-converter-api-dev-convertTb365ToApiTemplate --follow
# Purpose: Monitor Lambda function execution in real-time
```

### API Gateway Testing
```bash
# Test API Gateway endpoint (after deployment)
curl -X POST https://[api-id].execute-api.us-east-1.amazonaws.com/dev/convert \
  -H "Content-Type: application/json" \
  -H "x-api-key: tb365-dev-2025" \
  -d @integration-api/test-event.json
# Purpose: Test the deployed API endpoint with sample data
```

### S3 Bucket Verification
```bash
# List created S3 buckets
aws s3 ls | grep tb365
# Purpose: Verify S3 buckets were created successfully
```

```bash
# List objects in dev bucket (after successful conversions)
aws s3 ls s3://tb365-output-dev-510624138860/ --recursive
# Purpose: Check generated files from conversion operations
```

---

## Security & Access Management

### API Key Management
```bash
# Create API key in API Gateway (manual step after deployment)
aws apigateway create-api-key --name TB365-Dev-Key --description "Development API key for TB365 conversion"
# Purpose: Create dedicated API key for development testing
```

### S3 Bucket Policies
```bash
# Get bucket policy (after deployment)
aws s3api get-bucket-policy --bucket tb365-output-dev-510624138860
# Purpose: Review S3 bucket access policies
```

---

## Troubleshooting Commands

### Lambda Function Debugging
```bash
# Get Lambda function configuration
aws lambda get-function --function-name tb365-converter-api-dev-convertTb365ToApiTemplate
# Purpose: Check Lambda function settings, memory, timeout, environment variables
```

```bash
# Invoke Lambda function directly (bypass API Gateway)
aws lambda invoke --function-name tb365-converter-api-dev-convertTb365ToApiTemplate \
  --payload file://integration-api/test-event.json \
  response.json
# Purpose: Test Lambda function directly to isolate API Gateway issues
```

### API Gateway Debugging
```bash
# Get API Gateway information
aws apigateway get-rest-apis --query 'items[?name==`tb365-converter-api-dev`]'
# Purpose: Find API Gateway ID and configuration details
```

```bash
# Get API Gateway deployment information
aws apigateway get-deployments --rest-api-id [api-id]
# Purpose: Check API Gateway deployment status and stages
```

---

## Cost Management Commands

### Billing and Usage
```bash
# Get current month's costs for Lambda service
aws ce get-cost-and-usage --time-period Start=2025-09-01,End=2025-09-30 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE
# Purpose: Monitor AWS costs for deployed services
```

```bash
# List all Lambda functions (cost monitoring)
aws lambda list-functions --query 'Functions[?contains(FunctionName, `tb365`)]'
# Purpose: Find all TB365-related Lambda functions for cost tracking
```

---

## Cleanup Commands (For Future Reference)

### Remove Deployment
```bash
# Remove development deployment
cd integration-api
npx serverless remove --stage dev
# Purpose: Completely remove all AWS resources created by Serverless Framework
```

### Manual Resource Cleanup
```bash
# Delete S3 bucket contents (if needed)
aws s3 rm s3://tb365-output-dev-510624138860 --recursive
# Purpose: Remove all files from S3 bucket before deletion
```

```bash
# Delete S3 bucket (if needed)
aws s3api delete-bucket --bucket tb365-output-dev-510624138860
# Purpose: Remove S3 bucket completely
```

---

## Deployment Readiness Checklist

### Pre-Deployment Verification
- [x] AWS CLI configured and tested
- [x] Serverless Framework installed (v4.18.2)
- [x] Node.js dependencies installed (npm install completed)
- [x] Local testing completed successfully
- [x] SSL certificate available (templatestudio365.com)
- [x] CloudFront distribution identified
- [x] Environment variables defined

### Ready to Execute
```bash
# Complete deployment command sequence:
cd integration-api
export API_KEY="tb365-dev-2025"
export S3_BUCKET_DEV="tb365-output-dev-510624138860"  
npm run deploy:dev
```

### Post-Deployment Verification
```bash
# Test the deployed endpoint
curl -X POST https://[api-id].execute-api.us-east-1.amazonaws.com/dev/convert \
  -H "Content-Type: application/json" \
  -H "x-api-key: tb365-dev-2025" \
  -d @test-event.json
```

---

## Notes and Observations

### Infrastructure Strengths
- Existing templatestudio365.com certificate is production-ready
- CloudFront distribution provides global CDN capability
- AWS account is properly configured with appropriate permissions
- Serverless Framework configuration is complete and tested

### Potential Optimizations
- Consider using existing CloudFront distribution for custom domain
- Evaluate S3 bucket lifecycle policies for cost optimization  
- Implement CloudWatch alarms for monitoring
- Consider Lambda provisioned concurrency for consistent performance

### Security Considerations
- API key authentication is implemented
- Input validation and XSS protection in place
- S3 bucket permissions should follow principle of least privilege
- Consider WAF integration for additional API protection

---

## Cognito Authentication Integration

### User Pool Discovery
```bash
# List all existing Cognito user pools
aws cognito-idp list-user-pools --max-results 20
# Purpose: Discover existing Cognito user pools for JWT authentication integration
# Result: AccessDeniedException - IAM user templatestudio365 lacks cognito-idp:ListUserPools permission
# User Pool ID Provided: us-east-1_RIOPGg1Cq (staging environment)
```

```bash
# Get detailed user pool configuration for staging
aws cognito-idp describe-user-pool --user-pool-id us-east-1_RIOPGg1Cq
# Purpose: Examine user pool configuration, domain, and JWT settings
# Result: AccessDeniedException - Need Cognito permissions added to IAM user
# Staging Pool: us-east-1_RIOPGg1Cq
```

```bash
# List user pool clients (after identifying pool ID)
aws cognito-idp list-user-pool-clients --user-pool-id [POOL_ID]
# Purpose: Find existing app clients for JWT token generation
# Expected: Get client IDs and authentication configuration
```

### JWT Token Validation Setup
```bash
# Get user pool domain information (after identifying pool)
aws cognito-idp describe-user-pool-domain --domain [DOMAIN_NAME]
# Purpose: Get hosted UI domain for OAuth flows
# Expected: Domain configuration for login redirects
```

### Integration Planning

**Known Configuration:**
- **Staging User Pool ID**: `us-east-1_RIOPGg1Cq`
- **App Client ID**: `2addji24p0obg5sqedgise13i4`
- **JWT Issuer URL**: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RIOPGg1Cq`
- **Region**: us-east-1

**Implementation Steps:**
1. **Add Cognito Authorizer to serverless.yml**:
   - Configure HTTP API with JWT authorizer
   - Point to user pool: us-east-1_RIOPGg1Cq
   - Set audience (client ID) - needs to be provided

2. **Update Lambda Function**:
   - Remove API key authentication
   - Extract user info from JWT context
   - Add user-based access control

3. **Frontend Integration**:
   - Add JWT token to API requests
   - Handle token refresh
   - Implement login/logout flow

**Integration Concern Identified:**
- **User Pool Conflict**: us-east-1_RIOPGg1Cq may have redirect URLs configured for other project
- **Risk**: Authentication flow could redirect to wrong application
- **Need to Verify**: Callback URLs, hosted UI domain configuration

**Context**: Other project uses bare minimum Cognito hosted UI setup

**Recommended Options (in order of preference):**

**Option 1: New App Client (RECOMMENDED)**
- Create new app client in existing user pool us-east-1_RIOPGg1Cq
- Configure separate callback URLs for TB365 (e.g., http://localhost:5174/callback)
- Same users, separate application configurations
- **Pros**: Same user accounts, minimal setup
- **Cons**: Shared user pool configuration

**Option 2: API-Only JWT Authentication (CLEANEST)**
- Use existing user pool for JWT validation only
- No hosted UI, no callback URLs for TB365
- Frontend handles login via AWS SDK directly
- **Pros**: Zero redirect conflicts, most flexible
- **Cons**: Requires custom login UI in TB365

**Option 3: Dedicated TB365 User Pool (ISOLATED)**
- Create new user pool specifically for TB365
- Complete separation from other project
- **Pros**: Total isolation
- **Cons**: Users need separate accounts, more AWS resources

**Selected Approach: Option 1 - New App Client**

### Step 1: Create New App Client for TB365
```bash
# Create new app client in existing user pool
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_RIOPGg1Cq \
  --client-name "TB365-Client" \
  --generate-secret \
  --callback-urls "http://localhost:5174/callback" "https://templatestudio365.com/callback" \
  --logout-urls "http://localhost:5174/logout" "https://templatestudio365.com/logout" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers "COGNITO"
# Purpose: Create dedicated app client for TB365 with separate callback URLs
# Result: AccessDeniedException - Need Cognito permissions added to IAM user
# Status: MANUAL CREATION REQUIRED via AWS Console
```

### Manual Creation Steps (AWS Console)
**Since CLI lacks permissions, create via AWS Console:**
1. Go to AWS Console → Cognito → User Pools → us-east-1_RIOPGg1Cq
2. Click "App integration" tab
3. Scroll to "App clients and analytics" → Click "Create app client"
4. **App client name**: `TB365-Client`
5. **Client secret**: Generate (enable)
6. **Callback URLs**:
   - `http://localhost:5174/callback`
   - `https://templatestudio365.com/callback`
7. **Sign-out URLs**:
   - `http://localhost:5174/logout`
   - `https://templatestudio365.com/logout`
8. **OAuth 2.0 flows**: Authorization code grant
9. **OAuth 2.0 scopes**: email, openid, profile
10. Click "Create app client"
11. **Copy the new Client ID and Client Secret**

### Step 2: Update Serverless Configuration
**Once new app client is created, update serverless.yml:**
```bash
# Update serverless.yml with new TB365 client ID
# Replace COGNITO_CLIENT_ID environment variable
# Replace audience in httpApi.authorizers.cognitoAuthorizer
# File: integration-api/serverless.yml
```

### Step 3: Deploy Updated Configuration
```bash
# Deploy with new Cognito configuration
cd integration-api
export API_KEY=""  # Remove API key (no longer needed)
npm run deploy:dev
# Purpose: Deploy Lambda with Cognito JWT authentication
# Expected: API Gateway with JWT authorizer protecting all endpoints
```

### Step 4: Update Frontend Authentication
**Add to TB365 React app:**
- AWS Amplify or Cognito SDK integration
- Login/logout buttons
- JWT token management
- Protected route components

---

**Last Updated**: 2025-09-14
**Status**: Investigating Cognito integration for JWT authentication
**Next Step**: Discover existing Cognito user pools and JWT configuration