#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { handler } = require('./functions/tb365-converter');

/**
 * Test script to demonstrate all flexible output modes
 */

console.log('🚀 Testing TB365 Converter API - All Output Modes\n');

async function runTests() {
  try {
    // Load test data
    const testEventPath = path.join(__dirname, 'test-event-enhanced.json');
    const testEvent = JSON.parse(fs.readFileSync(testEventPath, 'utf8'));
    
    // Create base headers
    const headers = testEvent.headers;
    
    console.log('📋 Test Configuration:');
    console.log(`   Event File: test-event-enhanced.json`);
    console.log(`   Project: Enhanced Real Estate Template`);
    console.log(`   Elements: 6 (1 rectangle, 4 text, 1 table)`);
    console.log(`   Variables: Expected ~8 mixed content variables\n`);

    // Test 1: Check current output configuration
    console.log('1️⃣ Testing GET /output-config...');
    const configResult = await handler({
      httpMethod: 'GET',
      path: '/output-config',
      headers
    });
    console.log(`   Status: ${configResult.statusCode}`);
    if (configResult.statusCode === 200) {
      const config = JSON.parse(configResult.body).data.outputConfiguration;
      console.log(`   Current Mode: ${config.outputMode}`);
      console.log(`   Available Modes: ${config.availableModes.join(', ')}`);
    }
    console.log('');

    // Test 2: Response-only mode
    console.log('2️⃣ Testing OUTPUT_MODE = "response-only"...');
    await testOutputMode('response-only', testEvent, headers);

    // Test 3: Local file system mode
    console.log('3️⃣ Testing OUTPUT_MODE = "local"...');
    await testOutputMode('local', testEvent, headers);

    // Test 4: S3 Dev mode (will fail without real S3, but shows structure)
    console.log('4️⃣ Testing OUTPUT_MODE = "s3-dev"...');
    await testOutputMode('s3-dev', testEvent, headers);

    console.log('✅ All output mode tests completed!\n');
    console.log('📊 Summary:');
    console.log('   - response-only: Returns all data in API response');
    console.log('   - local: Saves to /tmp/test-output/{conversionId}/');
    console.log('   - s3-dev: Saves to dev S3 bucket under test-runs/{timestamp}/');
    console.log('   - s3-prod: Saves to production S3 bucket (original behavior)');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

async function testOutputMode(mode, testEvent, headers) {
  try {
    // Set output mode
    console.log(`   Setting output mode to: ${mode}`);
    const setModeResult = await handler({
      httpMethod: 'POST',
      path: '/output-config',
      headers,
      body: JSON.stringify({ outputMode: mode })
    });
    
    if (setModeResult.statusCode !== 200) {
      console.log(`   ❌ Failed to set mode: ${setModeResult.statusCode}`);
      return;
    }

    console.log(`   ✅ Mode set successfully`);
    
    // Run conversion
    console.log(`   Running conversion...`);
    const startTime = Date.now();
    const conversionResult = await handler(testEvent);
    const duration = Date.now() - startTime;
    
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Status: ${conversionResult.statusCode}`);
    
    if (conversionResult.statusCode === 200) {
      const responseData = JSON.parse(conversionResult.body).data;
      console.log(`   ✅ Conversion successful`);
      console.log(`   Output Mode: ${responseData.outputMode}`);
      console.log(`   Conversion ID: ${responseData.conversionId}`);
      console.log(`   Elements Processed: ${responseData.originalProject.elements}`);
      console.log(`   Variables Found: ${responseData.originalProject.variables}`);
      
      // Show mode-specific output details
      if (responseData.output) {
        const output = responseData.output;
        switch (output.outputMode) {
          case 'response-only':
            console.log(`   📦 Response Data:`);
            console.log(`      File Count: ${output.fileCount}`);
            console.log(`      Project Size: ${Math.round(output.dataSize.project / 1024)} KB`);
            console.log(`      CSS Size: ${Math.round(output.dataSize.css / 1024)} KB`);
            console.log(`      Data Size: ${Math.round(output.dataSize.data / 1024)} KB`);
            break;
            
          case 'local':
            console.log(`   📁 Local Files:`);
            console.log(`      Output Directory: ${output.outputDirectory}`);
            console.log(`      Files Saved: ${output.fileCount}`);
            if (output.localPaths) {
              Object.entries(output.localPaths).forEach(([name, path]) => {
                console.log(`         ${name}: ${path}`);
              });
            }
            break;
            
          case 's3-dev':
            console.log(`   ☁️  S3 Dev Bucket:`);
            console.log(`      Bucket: ${output.bucket}`);
            console.log(`      Base Path: ${output.basePath}`);
            console.log(`      Files Uploaded: ${output.fileCount}`);
            break;
            
          case 's3-prod':
            console.log(`   🏭 S3 Production:`);
            console.log(`      Bucket: ${output.bucket}`);
            console.log(`      Files: ${output.fileCount}`);
            if (output.downloadUrls) {
              console.log(`      Download URLs generated: ${Object.keys(output.downloadUrls).length}`);
            }
            break;
        }
      }
    } else {
      console.log(`   ❌ Conversion failed`);
      const errorData = JSON.parse(conversionResult.body);
      console.log(`   Error: ${errorData.error.message}`);
      
      // For S3 errors in local testing, this is expected
      if (mode.includes('s3') && errorData.error.message.includes('bucket does not exist')) {
        console.log(`   💡 This error is expected in local testing (no real S3 buckets)`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
  
  console.log('');
}

// Run the tests
runTests();