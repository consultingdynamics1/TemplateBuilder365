#!/usr/bin/env node

/**
 * Local test script for TB365 Converter Lambda
 * Usage: node test-local.js
 */

const { handler, health } = require('./functions/tb365-converter');
const fs = require('fs');
const path = require('path');

// Set environment variables for local testing
process.env.API_KEY = 'dev-api-key-change-me';
process.env.NODE_ENV = 'development';
process.env.TB365_BUCKET = 'tb365-designs-dev';
process.env.API_TEMPLATE_BUCKET = 'apitemplate-exports-dev';
process.env.REGION = 'us-east-1';

async function testHealthCheck() {
  console.log('🔍 Testing health check endpoint...');
  try {
    const result = await health();
    console.log('✅ Health check result:', result);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

async function testConversion() {
  console.log('🔍 Testing TB365 conversion...');
  
  try {
    // Load test event
    const testEventPath = path.join(__dirname, 'test-event-enhanced.json');
    const testEvent = JSON.parse(fs.readFileSync(testEventPath, 'utf8'));
    
    console.log('📄 Test event loaded:', {
      method: testEvent.httpMethod,
      path: testEvent.path,
      hasBody: !!testEvent.body,
      hasApiKey: !!testEvent.headers['x-api-key']
    });
    
    // Run the handler
    const startTime = Date.now();
    const result = await handler(testEvent);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ Conversion completed in ${duration}ms`);
    console.log('📊 Response status:', result.statusCode);
    
    if (result.statusCode === 200) {
      const responseData = JSON.parse(result.body);
      console.log('✅ Conversion successful:', {
        conversionId: responseData.data.conversionId,
        originalElements: responseData.data.originalProject.elements,
        generatedComponents: responseData.data.apiTemplateProject.components,
        variables: responseData.data.originalProject.variables,
        s3Paths: responseData.data.apiTemplateProject.s3Paths
      });
      return responseData.data;
    } else {
      const errorData = JSON.parse(result.body);
      console.error('❌ Conversion failed:', errorData);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Test conversion failed:', error);
    return null;
  }
}

async function testGetConversion(conversionId) {
  console.log(`🔍 Testing GET conversion for ID: ${conversionId}`);
  
  try {
    const getEvent = {
      httpMethod: 'GET',
      path: `/convert/${conversionId}`,
      pathParameters: { id: conversionId },
      headers: {
        'x-api-key': 'dev-api-key-change-me'
      }
    };
    
    const result = await handler(getEvent);
    console.log('📊 GET Response status:', result.statusCode);
    
    if (result.statusCode === 200) {
      const responseData = JSON.parse(result.body);
      console.log('✅ GET conversion successful:', {
        conversionId: responseData.data.conversionId,
        status: responseData.data.status,
        downloadUrls: Object.keys(responseData.data.downloadUrls),
        hasMetadata: !!responseData.data.conversionMetadata
      });
      return responseData.data;
    } else {
      const errorData = JSON.parse(result.body);
      console.error('❌ GET conversion failed:', errorData);
      return null;
    }
    
  } catch (error) {
    console.error('❌ GET test failed:', error);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting TB365 Converter API Tests\n');
  
  // Test 1: Health check
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  // Test 2: Conversion
  const conversionResult = await testConversion();
  console.log('');
  
  if (!conversionResult) {
    console.log('❌ Conversion test failed, stopping tests');
    return;
  }
  
  // Test 3: Get conversion
  const getResult = await testGetConversion(conversionResult.conversionId);
  console.log('');
  
  // Summary
  console.log('📋 Test Summary:');
  console.log(`✅ Health Check: ${healthOk ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Conversion: ${conversionResult ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Get Conversion: ${getResult ? 'PASSED' : 'FAILED'}`);
  
  if (healthOk && conversionResult && getResult) {
    console.log('\\n🎉 All tests passed! API is working correctly.');
  } else {
    console.log('\\n⚠️ Some tests failed. Check the logs above.');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testConversion,
  testGetConversion,
  runTests
};