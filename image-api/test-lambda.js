const { handler } = require('./functions/image-library');

// Test event that mimics API Gateway V2 HTTP API structure
const testEvent = {
  "version": "2.0",
  "routeKey": "GET /api/images",
  "rawPath": "/api/images",
  "rawQueryString": "userId=test-user",
  "headers": {
    "accept": "*/*",
    "content-type": "application/json",
    "host": "7lr787c2s3.execute-api.us-east-1.amazonaws.com",
    "origin": "https://de1ztc46ci2dy.cloudfront.net"
  },
  "queryStringParameters": {
    "userId": "test-user"
  },
  "requestContext": {
    "accountId": "510624138860",
    "apiId": "7lr787c2s3",
    "domainName": "7lr787c2s3.execute-api.us-east-1.amazonaws.com",
    "http": {
      "method": "GET",
      "path": "/api/images",
      "protocol": "HTTP/1.1",
      "sourceIp": "127.0.0.1"
    },
    "requestId": "test-request-id",
    "routeKey": "GET /api/images",
    "stage": "$default",
    "time": "02/Oct/2025:22:27:54 +0000",
    "timeEpoch": 1759444074736
  },
  "isBase64Encoded": false
};

async function testLambda() {
  console.log('🧪 Testing Lambda function locally...');
  console.log('📋 Test Event:', JSON.stringify(testEvent, null, 2));

  try {
    const result = await handler(testEvent);
    console.log('\n✅ Lambda Response:');
    console.log('📋 Status Code:', result.statusCode);
    console.log('📋 Headers:', JSON.stringify(result.headers, null, 2));
    console.log('📋 Body:', result.body);

    // Check CORS headers
    if (result.headers && result.headers['Access-Control-Allow-Origin']) {
      console.log('✅ CORS headers present');
    } else {
      console.log('❌ CORS headers missing!');
    }

  } catch (error) {
    console.error('❌ Lambda Error:', error);
  }
}

testLambda();