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
4. **App client type**: Single Page Application (SPA)
5. **App client name**: `TB365-Client`
6. **Client secret**: Do NOT generate (SPA doesn't use client secrets)
7. **Callback URLs** (copy these exact URLs):
   ```
   http://localhost:5174/home.html
   https://templatestudio365.com/home.html
   https://templatestudio365.com/
   ```

**✅ Solution Found**: Type URLs manually - copy/paste can introduce hidden characters

**Confirmed Working**: `http://localhost:5174/home.html` (manually typed)

**✅ App Client Created Successfully**
- **Client ID**: `3cmamjngo6rsvqrbi5ohuarji3`
- **Type**: Single Page Application (SPA)
- **Status**: Ready for integration

**❌ Login Error Encountered:**
```json
{"code":"BadRequest","message":"The server did not understand the operation that was requested.","type":"client"}
```

**🔧 Required Fix: Configure Hosted UI Domain**

### Step 1.5: Configure Cognito Hosted UI Domain
```bash
# The user pool needs a hosted UI domain configured
# Go to AWS Console → Cognito → User Pools → us-east-1_RIOPGg1Cq
# Click "App integration" tab → Domain section → "Actions" → "Create domain"
```

**Manual Steps via AWS Console:**
1. Go to User Pool: us-east-1_RIOPGg1Cq
2. Click "App integration" tab
3. Find "Domain" section
4. Click "Actions" → "Create domain"
**✅ Domain Already Exists (from existing app):**
- **Domain URL**: `https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com`
- **Status**: Active and ready to use

**❌ New Error: invalid_request**
- **Issue**: OAuth configuration problem with app client settings
- **Likely Cause**: App client missing OAuth configuration or incorrect flow settings

**🔧 Fix Required: Update App Client OAuth Settings**

### Step 1.6: Configure OAuth Settings in App Client
**Go back to the TB365-Client app client and verify/update:**

1. **Go to**: AWS Console → Cognito → User Pools → us-east-1_RIOPGg1Cq
2. **Click**: "App integration" tab
3. **Find**: TB365-Client in "App clients" section
4. **Click**: TB365-Client name to edit
5. **Verify these settings are enabled:**
   - ✅ **OAuth 2.0 grant types**: Authorization code grant
   - ✅ **OAuth 2.0 scopes**: email, openid, profile
   - ✅ **Allowed callback URLs**: All URLs we added earlier
   - ✅ **Allowed sign-out URLs**: All URLs we added earlier
6. **Save changes** if any were missing

**✅ Progress: URL Construction Working**
- **Generated URL**: `https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com/login?client_id=3cmamjngo6rsvqrbi5ohuarji3&redirect_uri=http://localhost:5174/home.html&response_type=code&scope=email+openid+profile`
- **New Error**: 403 Forbidden
- **Root Cause**: App client configuration mismatch or missing hosted UI settings

**🔧 Step-by-Step Fix for Existing TB365-Client:**

### Detailed Configuration Steps:

1. **Go to AWS Console** → Cognito → User Pools → `us-east-1_RIOPGg1Cq`
2. **Click "App integration" tab**
3. **Scroll to "App clients and analytics"**
4. **Click on "TB365-Client" name** (not the edit button)
5. **Look for "Login pages" tab** (where OAuth settings are located)

### Required Settings to Verify/Fix:

**✅ Found Settings Location: "Login pages" tab**

**OAuth 2.0 Settings (in Login pages tab):**
- ✅ **OAuth 2.0 grant types**:
  - ☑️ **Authorization code grant** (MUST be checked)
- ✅ **OAuth 2.0 scopes**:
  - ☑️ **email** (MUST be checked)
  - ☑️ **openid** (MUST be checked)
  - ☑️ **profile** (MUST be checked)
- ✅ **Allowed callback URLs**: Should contain:
  ```
  http://localhost:5174/home.html
  https://templatestudio365.com/home.html
  https://templatestudio365.com/
  ```
- ✅ **Allowed sign-out URLs**: Should contain:
  ```
  http://localhost:5174/logout
  https://templatestudio365.com/logout
  ```

**Identity Providers:**
- ✅ **Identity providers**:
  - ☑️ **Cognito User Pool** (MUST be selected)

6. **Click "Save changes"**
7. **Wait 1-2 minutes** for changes to propagate
8. **Test the login button again**

**❌ Settings Already Correct - Still Getting 403**
- OAuth 2.0 grant types: ✅ Authorization code grant (checked)
- OAuth 2.0 scopes: ✅ email, openid, profile (checked)
- Callback URLs: ✅ Configured correctly

**🔍 Additional Troubleshooting Steps:**

### Option 1: Check User Pool General Settings
1. Go to User Pool `us-east-1_RIOPGg1Cq` main page
2. Click **"Sign-in experience"** tab
3. Verify **"Federated identity provider sign-in"** is enabled
4. Check **"Attribute verification and user account confirmation"** settings

### Option 2: Test with Different Callback URL
1. Temporarily change callback URL in home.html to just: `http://localhost:5174`
2. Test if login works with simpler callback
3. Check if the issue is specific to `/home.html` path

### Option 3: Check User Pool Domain Configuration
1. Verify the domain `https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com` is actually active
2. Try accessing the domain directly in browser
3. Should show a Cognito error page, not a 404

**✅ Domain Test Result:**
- Direct access to domain: `{"message":"Missing Authentication Token"}`
- **Status**: ✅ Domain is active and working (this error is expected)
- **Root Cause**: The 403 issue is likely in the OAuth parameter combination

**🔍 New Strategy: Compare Working vs TB365-Client**

### App Client Comparison Checklist:

**Step 1: Find Both App Clients**
1. Go to User Pool `us-east-1_RIOPGg1Cq` → "App integration" tab
2. In "App clients and analytics" section:
   - **TB365-Client** (Client ID: `3cmamjngo6rsvqrbi5ohuarji3`) - ❌ Not working
   - **Working Client** (Client ID: `2addji24p0obg5sqedgise13i4`) - ✅ Works for other app

**Step 2: Compare Settings Side by Side**
For each client, check these settings and tell me the differences:

**Basic Settings:**
- App client type: [SPA vs Confidential vs Public]
- App client name
- Client ID
- Client secret: [Generated vs None]

**Authentication Settings:**
- Authentication flows enabled
- User pool policy settings

**OAuth Settings (Login pages tab):**
- OAuth 2.0 grant types checked
- OAuth 2.0 scopes selected
- Callback URLs configured
- Sign-out URLs configured

### 🔍 **Key Differences Found in Working TemplateStudio365 Application:**

**Working Configuration (Client ID: 2addji24p0obg5sqedgise13i4):**
- **Domain**: `https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com` ✅ (Same)
- **User Pool ID**: `us-east-1_RIOPGg1Cq` ✅ (Same)
- **Region**: `us-east-1` ✅ (Same)
- **OAuth Scopes**: `openid email profile` ✅ (Same as ours)
- **Response Type**: `code` ✅ (Same as ours)

**Critical Differences Discovered:**
1. **PKCE Implementation**: Working app uses **PKCE (Proof Key for Code Exchange)**
   - Generates `code_verifier` and `code_challenge`
   - Uses `code_challenge_method: 'S256'`
   - Our home.html **does NOT use PKCE**

2. **OAuth URL Structure**: Working app uses `/login` endpoint:
   - **Working URL**: `${cognitoDomain}/login?${params}`
   - **Our URL**: `${cognitoDomain}/oauth2/authorize?${params}`

3. **Required Parameters**: Working app includes PKCE parameters:
   - `code_challenge` (required for SPA)
   - `code_challenge_method: 'S256'` (required for SPA)

**🧪 Testing with Working Client ID:**
- **Temporarily using**: `2addji24p0obg5sqedgise13i4` (known working client)
- **URL Generated**: `https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com/login?client_id=2addji24p0obg5sqedgise13i4&response_type=code&scope=email+openid+profile&redirect_uri=http%253A%252F%252Flocalhost%253A5174&code_challenge=gON6ymVd7FTCBo82YjbaxJh-2s6T_WHXDyysDSmYOL4&code_challenge_method=S256`
- **Result**: 400 Bad Request - likely **callback URL mismatch**

**Root Cause**: Working client expects different redirect URI from TS365 app:
- **TS365 staging callback**: `https://d1j44ainjnbn12.cloudfront.net/dashboard.html`
- **Our test callback**: `http://localhost:5174`

**Solution**: Use TB365-Client with correct localhost callback URL

**🔍 Final Troubleshooting: TB365-Client Still Not Working**
- **PKCE URL**: `https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com/login?client_id=3cmamjngo6rsvqrbi5ohuarji3&response_type=code&scope=email+openid+profile&redirect_uri=http%253A%252F%252Flocalhost%253A5174&code_challenge=P9gNs2NbbUgSl1z0YWwxOkWYErFBamTdEFIzC_R_qfk&code_challenge_method=S256`
- **Result**: Still not working despite correct PKCE implementation

**Possible Issues with TB365-Client:**
1. **App Client Type**: May need to be "Public client" instead of "Single page application"
2. **Missing Authentication Flows**: SRP or Custom auth flows not enabled
3. **Hosted UI Not Enabled**: App client may not be configured for hosted UI
4. **Identity Provider**: "Cognito User Pool" may not be selected

**Recommended Fix**: Check working client type and recreate TB365-Client with exact same settings

### AWS CLI Comparison Attempt
```bash
# Tried to compare client configurations via AWS CLI
aws cognito-idp describe-user-pool-client --user-pool-id us-east-1_RIOPGg1Cq --client-id 2addji24p0obg5sqedgise13i4
aws cognito-idp describe-user-pool-client --user-pool-id us-east-1_RIOPGg1Cq --client-id 3cmamjngo6rsvqrbi5ohuarji3
# Result: AccessDeniedException - Need cognito-idp:DescribeUserPoolClient permission
```

**IAM Permissions Needed for AWS CLI Cognito Access:**

Add this policy to `templatestudio365` IAM user:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:DescribeUserPool",
                "cognito-idp:DescribeUserPoolClient",
                "cognito-idp:ListUserPoolClients",
                "cognito-idp:ListUserPools"
            ],
            "Resource": [
                "arn:aws:cognito-idp:us-east-1:510624138860:userpool/us-east-1_RIOPGg1Cq",
                "arn:aws:cognito-idp:us-east-1:510624138860:userpool/us-east-1_RIOPGg1Cq/*"
            ]
        }
    ]
}
```

**Steps to Add:**
1. Go to AWS Console → IAM → Users → templatestudio365
2. Click "Add permissions" → "Create inline policy"
3. JSON tab → paste above policy
4. Name: "CognitoReadAccess"
5. Create policy

**Then retry AWS CLI commands to compare client configurations**

### 🔍 **AWS CLI Client Configuration Comparison Results:**

**✅ Both Clients Are IDENTICAL in Critical Settings:**

| Setting | Working Client (2addji24p0obg5sqedgise13i4) | TB365-Client (3cmamjngo6rsvqrbi5ohuarji3) | Status |
|---------|------------------------------------------------|---------------------------------------------|---------|
| **ExplicitAuthFlows** | ALLOW_REFRESH_TOKEN_AUTH, ALLOW_USER_AUTH, ALLOW_USER_SRP_AUTH | ALLOW_REFRESH_TOKEN_AUTH, ALLOW_USER_AUTH, ALLOW_USER_SRP_AUTH | ✅ Same |
| **SupportedIdentityProviders** | COGNITO | COGNITO | ✅ Same |
| **AllowedOAuthFlows** | code | code | ✅ Same |
| **AllowedOAuthScopes** | email, openid, profile | email, openid, profile | ✅ Same |
| **AllowedOAuthFlowsUserPoolClient** | true | true | ✅ Same |

**🎯 Key Findings:**
- **TB365-Client is configured correctly** - all OAuth settings match the working client
- **Callback URLs include localhost**: `http://localhost:5174` ✅
- **Problem is NOT in the app client configuration**

**🚨 Real Issue Identified:**
The TB365-Client configuration is **perfect**. The issue must be elsewhere - likely in our PKCE implementation or URL construction.

### ✅ **AWS CLI Verification: Both Clients Have Same Scopes**
- **Working client scopes**: `["email", "openid", "profile"]`
- **TB365-Client scopes**: `["email", "openid", "profile"]`
- **Status**: ✅ IDENTICAL - not the issue

### 🧩 **Looking for Other Differences:**
Since both clients are configured identically, the issue might be:
1. **URL parameter order**
2. **URL encoding differences**
3. **Domain/endpoint issue**
4. **User pool domain association**

**Current 400 Error**: Need to investigate deeper into Cognito hosted UI configuration

### 🔍 **Working URL vs Our URL Comparison:**

**Working TS365 Staging URL:**
```
https://us-east-13hkrx6tkf.auth.us-east-1.amazoncognito.com/login?client_id=fvloc1s716d27ifqm9n1ofg3g&response_type=code&scope=email+openid&redirect_uri=https%3A%2F%2Ftemplatestudio365.com%2Fdashboard.html&code_challenge=GLC_LEVdRajLjx4TxuR_qwSgjitXMu2eNveoFmIQjCw&code_challenge_method=S256
```

**Our TB365 URL:**
```
https://us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com/login?client_id=3cmamjngo6rsvqrbi5ohuarji3&response_type=code&scope=email+openid+profile&redirect_uri=http%253A%252F%252Flocalhost%253A5174&code_challenge=...&code_challenge_method=S256
```

**🚨 CRITICAL DIFFERENCES FOUND:**
1. **Different Cognito Domains**:
   - Working: `us-east-13hkrx6tkf.auth.us-east-1.amazoncognito.com` ❌
   - Ours: `us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com` ❌

2. **Different Client IDs**:
   - Working: `fvloc1s716d27ifqm9n1ofg3g` ❌
   - Ours: `3cmamjngo6rsvqrbi5ohuarji3` ❌

3. **Scope Difference**:
   - Working: `scope=email+openid` ✅
   - Ours: `scope=email+openid+profile` ❌

**ROOT CAUSE**: We've been using the WRONG user pool domain and wrong client ID!
8. **Sign-out URLs** (enter one per line, no special formatting):
   ```
   http://localhost:5174/logout
   https://templatestudio365.com/logout
   ```

**Important**: Enter each URL on a separate line in the Cognito console. Do not use markdown formatting, bullets, or parentheses - just the plain URLs.

**Note**: Staging URLs can be added later when staging environment is configured
9. **OAuth 2.0 flows**: Authorization code grant
10. **OAuth 2.0 scopes**: email, openid, profile
11. Click "Create app client"
12. **Copy the new Client ID** (no client secret for SPA)

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

### Step 4: Create Test Authentication Page
**Create home.html test page for Cognito callback testing:**
```bash
# Create simple test page in public directory
# File: public/home.html
# Purpose: Test Cognito authentication flow safely before integrating with main app
# Features: Display user info, JWT token, login/logout functionality
```

### Step 5: Update Frontend Authentication
**Add to TB365 React app (after testing):**
- AWS Amplify or Cognito SDK integration
- Login/logout buttons
- JWT token management
- Protected route components
- Integration with existing canvas application

**Testing Strategy:**
1. **Phase 1**: Test authentication flow with home.html (localhost)
2. **Phase 2**: Test on production domain with home.html
3. **Phase 3**: Integrate with React app after verification
4. **Phase 4**: Add staging environment URLs when needed

**Deployment Path:**
- **Development**: `http://localhost:5174/home.html` (immediate testing)
- **Production Test**: `https://templatestudio365.com/home.html` (verify on live domain)
- **Production App**: `https://templatestudio365.com/` (main TB365 app integration)
- **Staging**: Add staging URLs to Cognito when CloudFront staging is configured

**Benefits**: Start simple with dev + production, add staging later without complexity.

---

**Last Updated**: 2025-09-14
**Status**: Investigating Cognito integration for JWT authentication
**Next Step**: Discover existing Cognito user pools and JWT configuration