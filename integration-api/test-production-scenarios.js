#!/usr/bin/env node

/**
 * Production Test Scenarios for TB365 Variable Replacement System
 * Tests error handling, validation, and Lambda integration
 */

const { variableReplacer } = require('./services/variable-replacer');
const { handler } = require('./functions/tb365-converter');

async function runProductionTests() {
  console.log('🧪 TB365 Production Test Scenarios');
  console.log('==================================\n');

  const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Test 1: Invalid phone number format
  console.log('1️⃣ Testing invalid phone number validation...');
  try {
    const invalidPhoneData = {
      agent: {
        phone: 'not-a-phone-number'
      }
    };
    
    const result = variableReplacer.replaceVariables(
      '<p>Call: {{agent.phone}}</p>',
      invalidPhoneData
    );
    
    const phoneWarnings = result.warnings?.filter(w => w.type === 'VALIDATION_WARNING' && w.key === 'phone');
    if (phoneWarnings?.length > 0) {
      console.log('   ✅ Invalid phone number detected and warned');
      testResults.passed++;
    } else {
      console.log('   ❌ Failed to detect invalid phone number');
      testResults.failed++;
    }
  } catch (error) {
    console.log('   ❌ Test failed with error:', error.message);
    testResults.failed++;
  }

  // Test 2: XSS injection attempt
  console.log('\n2️⃣ Testing XSS injection protection...');
  try {
    const maliciousData = {
      title: '<script>alert("XSS")</script>Innocent Title'
    };
    
    const result = variableReplacer.replaceVariables(
      '<h1>{{title}}</h1>',
      maliciousData
    );
    
    if (result.success && !result.html.includes('<script>')) {
      console.log('   ✅ XSS content sanitized successfully');
      testResults.passed++;
      
      const securityWarnings = result.warnings?.filter(w => w.type === 'SECURITY_WARNING');
      if (securityWarnings?.length > 0) {
        console.log('   ✅ Security warning generated');
        testResults.warnings++;
      }
    } else {
      console.log('   ❌ XSS content not properly sanitized');
      testResults.failed++;
    }
  } catch (error) {
    console.log('   ❌ Test failed with error:', error.message);
    testResults.failed++;
  }

  // Test 3: Missing required variables
  console.log('\n3️⃣ Testing missing variable handling...');
  try {
    const incompleteData = {
      agent: {
        name: 'John Doe'
      }
      // Missing property data
    };
    
    const result = variableReplacer.replaceVariables(
      '<p>Agent: {{agent.name}}</p><p>Property: {{property.address}}</p>',
      incompleteData
    );
    
    if (result.success && result.missing?.length > 0) {
      console.log(`   ✅ Missing variables tracked: ${result.missing.length}`);
      console.log(`   📊 Replacement rate: ${result.statistics.replacedVariables}/${result.statistics.totalVariables}`);
      testResults.passed++;
    } else {
      console.log('   ❌ Missing variables not properly tracked');
      testResults.failed++;
    }
  } catch (error) {
    console.log('   ❌ Test failed with error:', error.message);
    testResults.failed++;
  }

  // Test 4: Large template performance
  console.log('\n4️⃣ Testing large template performance...');
  try {
    // Generate a large template with many variables
    let largeTemplate = '<html><body>';
    const testData = {};
    
    for (let i = 0; i < 500; i++) {
      largeTemplate += `<p>Item ${i}: {{item${i}.name}} - {{item${i}.price}}</p>`;
      testData[`item${i}`] = {
        name: `Product ${i}`,
        price: `${(Math.random() * 1000).toFixed(2)}`
      };
    }
    largeTemplate += '</body></html>';
    
    const startTime = Date.now();
    const result = variableReplacer.replaceVariables(largeTemplate, testData);
    const endTime = Date.now();
    
    if (result.success && result.processingTime < 1000) { // Less than 1 second
      console.log(`   ✅ Large template processed in ${endTime - startTime}ms`);
      console.log(`   📊 ${result.statistics.totalVariables} variables processed`);
      testResults.passed++;
    } else {
      console.log(`   ❌ Performance test failed: ${endTime - startTime}ms`);
      testResults.failed++;
    }
  } catch (error) {
    console.log('   ❌ Test failed with error:', error.message);
    testResults.failed++;
  }

  // Test 5: Lambda integration with variable replacement
  console.log('\n5️⃣ Testing Lambda integration with variable replacement...');
  try {
    const lambdaEvent = {
      httpMethod: 'POST',
      path: '/convert',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tb365Data: {
          projectName: 'Lambda Integration Test',
          version: '1.0',
          canvasState: {
            elements: [
              {
                id: 'text-1',
                type: 'text',
                position: { x: 10, y: 10 },
                size: { width: 200, height: 50 },
                visible: true,
                locked: false,
                name: 'test-text',
                zIndex: 1,
                content: 'Hello {{user.name}}! Price: {{product.price}}',
                fontSize: 16,
                fontFamily: 'Arial',
                color: '#000000'
              }
            ],
            selectedElementId: null,
            editingElementId: null,
            editingTableCell: null,
            activeTool: 'select',
            canvasSize: { width: 400, height: 200 },
            zoom: 1,
            snapToGrid: false,
            gridSize: 20
          }
        },
        data: {
          user: {
            name: 'Alice Cooper'
          },
          product: {
            price: '299.99'
          }
        },
        options: {
          outputFormat: 'json',
          includeAssets: false,
          generatePreview: false
        }
      })
    };

    const lambdaResult = await handler(lambdaEvent);
    
    if (lambdaResult.statusCode === 200) {
      const responseData = JSON.parse(lambdaResult.body);
      
      if (responseData.data?.htmlResult?.variableReplacement?.statistics) {
        const stats = responseData.data.htmlResult.variableReplacement.statistics;
        console.log(`   ✅ Lambda integration successful`);
        console.log(`   📊 Variables replaced: ${stats.replacedVariables}/${stats.totalVariables}`);
        
        // Check if the final HTML contains replaced values
        const finalHtml = responseData.data.htmlResult.html;
        if (finalHtml.includes('Alice Cooper') && finalHtml.includes('$299.99')) {
          console.log('   ✅ Variables successfully replaced in final output');
          testResults.passed++;
        } else {
          console.log('   ❌ Variables not found in final output');
          testResults.failed++;
        }
      } else {
        console.log('   ❌ Variable replacement data not found in response');
        testResults.failed++;
      }
    } else {
      console.log(`   ❌ Lambda returned error: ${lambdaResult.statusCode}`);
      console.log('   Error:', JSON.parse(lambdaResult.body));
      testResults.failed++;
    }
  } catch (error) {
    console.log('   ❌ Lambda integration test failed:', error.message);
    testResults.failed++;
  }

  // Test 6: Concurrent request simulation
  console.log('\n6️⃣ Testing concurrent request handling...');
  try {
    const concurrentRequests = [];
    const testTemplate = '<p>User: {{user.name}}</p><p>ID: {{user.id}}</p>';
    
    // Create 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      const promise = variableReplacer.replaceVariables(testTemplate, {
        user: { name: `User${i}`, id: i }
      });
      concurrentRequests.push(promise);
    }
    
    const startTime = Date.now();
    const results = await Promise.all(concurrentRequests);
    const endTime = Date.now();
    
    const allSuccessful = results.every(r => r.success);
    
    if (allSuccessful) {
      console.log(`   ✅ All 10 concurrent requests completed successfully in ${endTime - startTime}ms`);
      testResults.passed++;
    } else {
      console.log('   ❌ Some concurrent requests failed');
      testResults.failed++;
    }
  } catch (error) {
    console.log('   ❌ Concurrent test failed:', error.message);
    testResults.failed++;
  }

  // Test 7: Memory cleanup validation
  console.log('\n7️⃣ Testing memory cleanup...');
  try {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process many templates to test memory usage
    for (let i = 0; i < 100; i++) {
      const template = `<div>Test ${i}: {{data.value${i}}}</div>`.repeat(10);
      const data = {};
      for (let j = 0; j < 10; j++) {
        data[`value${j}`] = `Value ${i}-${j}`;
      }
      
      variableReplacer.replaceVariables(template, { data });
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseKB = Math.round(memoryIncrease / 1024);
    
    if (memoryIncreaseKB < 10000) { // Less than 10MB increase
      console.log(`   ✅ Memory usage acceptable: +${memoryIncreaseKB}KB`);
      testResults.passed++;
    } else {
      console.log(`   ⚠️  Memory usage high: +${memoryIncreaseKB}KB`);
      testResults.warnings++;
    }
  } catch (error) {
    console.log('   ❌ Memory test failed:', error.message);
    testResults.failed++;
  }

  // Test Summary
  console.log('\n🎯 Production Test Summary');
  console.log('==========================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  
  const totalTests = testResults.passed + testResults.failed;
  const passRate = Math.round((testResults.passed / totalTests) * 100);
  
  console.log(`📊 Pass Rate: ${passRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All production tests passed! System is ready for deployment.');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review and fix before deployment.`);
  }

  return {
    success: testResults.failed === 0,
    results: testResults,
    passRate
  };
}

// Auto-run if called directly
if (require.main === module) {
  process.env.NODE_ENV = 'development'; // Skip auth for testing
  runProductionTests().catch(console.error);
}

module.exports = { runProductionTests };