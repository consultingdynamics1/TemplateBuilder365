const { handler } = require('./functions/image-library');

// Test POST /api/images/upload
const testPostEvent = {
  "version": "2.0",
  "routeKey": "POST /api/images/upload",
  "rawPath": "/api/images/upload",
  "rawQueryString": "",
  "headers": {
    "accept": "*/*",
    "content-type": "application/json",
    "host": "7lr787c2s3.execute-api.us-east-1.amazonaws.com",
    "origin": "https://de1ztc46ci2dy.cloudfront.net"
  },
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/api/images/upload",
      "protocol": "HTTP/1.1",
      "sourceIp": "127.0.0.1"
    },
    "requestId": "test-post-request",
    "routeKey": "POST /api/images/upload"
  },
  "body": JSON.stringify({
    "filename": "test.jpg",
    "contentType": "image/jpeg"
  }),
  "isBase64Encoded": false
};

async function testPostLambda() {
  console.log('🧪 Testing POST Lambda function locally...');

  try {
    const result = await handler(testPostEvent);
    console.log('\n✅ POST Lambda Response:');
    console.log('📋 Status Code:', result.statusCode);
    console.log('📋 Headers:', JSON.stringify(result.headers, null, 2));
    console.log('📋 Body:', result.body);

  } catch (error) {
    console.error('❌ POST Lambda Error:', error);
  }
}

testPostLambda();