# Image API Test Harness

## Overview
Comprehensive testing suite for the deployed tb365-image-api-stage endpoints.

## Setup

### 1. Install Dependencies
```bash
npm install form-data node-fetch canvas
```

### 2. Get JWT Token
You'll need a valid JWT token from Cognito for authenticated tests:
1. Log into the CloudFront app: https://de1ztc46ci2dy.cloudfront.net/
2. Open browser dev tools → Application → Local Storage
3. Copy the value of `tb365_token`
4. Update `MOCK_JWT_TOKEN` in `image-api-test.js`

### 3. Add Test Images (Optional)
- The script will create test images programmatically using Canvas
- You can also manually add images to `tests/test-images/`
- Supported formats: PNG, JPG, JPEG, WebP

## Running Tests

```bash
# Run the complete test suite
node tests/image-api-test.js

# Or run from project root
npm test  # (if we add test script to package.json)
```

## Test Coverage

### Endpoints Tested
- ✅ `GET /health` - Health check (no auth)
- ✅ `POST /api/images` - Upload image with metadata
- ✅ `GET /api/images` - List user's images
- ✅ `GET /api/images/{id}` - Retrieve specific image
- ✅ `GET /api/images/search` - Search images by tags
- ✅ `DELETE /api/images/{id}` - Delete image

### Test Scenarios
- Image upload with various formats and sizes
- Metadata and tagging functionality
- User isolation (images stored under userId)
- Authentication with JWT tokens
- Search and retrieval operations
- Cleanup and deletion

## Configuration

### Environment Variables
- `IMAGE_API_URL`: https://7lr787c2s3.execute-api.us-east-1.amazonaws.com
- `TEST_USER_ID`: test-user-123 (can be changed in script)

### Test Data
- Test images are created programmatically or loaded from `test-images/`
- Each test run uses a consistent test user ID
- Images are tagged for easy identification during tests

## Expected Results

### Successful Test Run
```
🚀 Starting Image API Test Harness
✅ Health check passed
✅ Image upload successful: small-test.png
✅ Image upload successful: medium-test.png
✅ Image list successful: 2 images found
✅ Image retrieval successful
✅ Image search successful: 1 images found
✅ Image deletion successful

📊 TEST SUMMARY
✅ Passed: 6
❌ Failed: 0
📈 Success Rate: 100%
```

### Troubleshooting

**Authentication Errors (401)**
- Update JWT token in script
- Ensure token is not expired
- Verify Cognito configuration

**Upload Errors (403/500)**
- Check S3 bucket permissions
- Verify Lambda function has proper IAM roles
- Check CloudWatch logs for detailed errors

**Network Errors**
- Verify IMAGE_API_URL is correct
- Check if stack is deployed: `aws cloudformation describe-stacks --stack-name tb365-image-api-stage`