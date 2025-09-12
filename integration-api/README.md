# TB365 Converter API

Serverless AWS Lambda API that converts TemplateBuilder365 design format to APITemplate.io format.

## Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured (for deployment)
- Serverless Framework (optional for deployment)

### Local Testing

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run local tests:**
   ```bash
   npm run test:local
   ```

3. **Test with Serverless offline:**
   ```bash
   npm install -g serverless
   npm run test:lambda
   ```

### API Endpoints

- `POST /convert` - Convert TB365 to APITemplate.io format
- `GET /convert/{id}` - Get conversion status and download links
- `GET /health` - Health check

### Authentication

All endpoints require `x-api-key` header:
```bash
curl -H "x-api-key: your-api-key" -H "Content-Type: application/json" \\
     -d @test-event.json \\
     https://your-api-gateway-url/convert
```

### Test Event Structure

```json
{
  "tb365Data": {
    "projectName": "Real Estate Listing Template",
    "version": "1.0",
    "canvasState": {
      "elements": [...],
      "canvasSize": { "width": 800, "height": 600 }
    }
  },
  "options": {
    "outputFormat": "json",
    "generatePreview": true
  }
}
```

### Response Structure

```json
{
  "success": true,
  "data": {
    "conversionId": "uuid",
    "status": "completed",
    "originalProject": {
      "name": "Real Estate Listing Template",
      "elements": 5,
      "variables": 8
    },
    "apiTemplateProject": {
      "downloadUrls": {
        "main": "https://s3-presigned-url",
        "versioned": "https://s3-versioned-url",
        "metadata": "https://s3-metadata-url"
      },
      "s3Paths": {
        "main": "conversions/uuid/apitemplate-project.json",
        "versioned": "conversions/uuid/versions/apitemplate-project-timestamp.json",
        "metadata": "conversions/uuid/metadata.json"
      }
    }
  }
}
```

### Features

- ✅ TB365 format validation
- ✅ Element conversion (rectangles, text, images, tables)  
- ✅ Variable extraction from `{{variable}}` syntax
- ✅ S3 storage with versioning
- ✅ Presigned download URLs
- ✅ API key authentication
- ✅ Comprehensive error handling

### Deployment

```bash
# Development
npm run deploy:dev

# Production  
npm run deploy:prod
```

### Environment Variables

- `API_KEY` - API authentication key
- `TB365_BUCKET` - S3 bucket for TB365 files
- `API_TEMPLATE_BUCKET` - S3 bucket for converted files
- `REGION` - AWS region
- `NODE_ENV` - Environment (dev/prod)