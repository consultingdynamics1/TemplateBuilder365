// Test if AWS SDK is available in Lambda runtime
exports.handler = async (event) => {
  try {
    console.log('Testing AWS SDK availability...');

    // Test if AWS SDK is available
    const AWS = require('aws-sdk');
    console.log('AWS SDK loaded successfully');

    // Test S3 client
    const s3 = new AWS.S3({ region: 'us-east-1' });
    console.log('S3 client created successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'AWS SDK test successful',
        sdk_version: AWS.VERSION,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('AWS SDK test failed:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'AWS SDK test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};