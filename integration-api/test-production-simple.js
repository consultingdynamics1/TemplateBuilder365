#!/usr/bin/env node

/**
 * Simple Production Test for Variable Replacement System
 * Tests core functionality without Lambda integration
 */

const { variableReplacer } = require('./services/variable-replacer');

async function runSimpleProductionTests() {
  console.log('🧪 Variable Replacer Production Tests');
  console.log('===================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: XSS Protection
  console.log('1️⃣ Testing XSS protection...');
  try {
    const result = variableReplacer.replaceVariables(
      '<h1>{{title}}</h1>',
      { title: '<script>alert("XSS")</script>Safe Title' }
    );
    
    if (result.success && !result.html.includes('<script>')) {
      console.log('   ✅ XSS content sanitized');
      passed++;
    } else {
      console.log('   ❌ XSS content not sanitized');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Test 2: Phone Number Validation
  console.log('\n2️⃣ Testing phone validation...');
  try {
    const result = variableReplacer.replaceVariables(
      '<p>{{agent.phone}}</p>',
      { agent: { phone: 'invalid-phone' } }
    );
    
    const hasPhoneWarning = result.warnings?.some(w => 
      w.type === 'VALIDATION_WARNING' && w.key === 'phone'
    );
    
    if (hasPhoneWarning) {
      console.log('   ✅ Invalid phone detected and warned');
      passed++;
    } else {
      console.log('   ❌ Invalid phone not detected');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Test 3: Performance Test
  console.log('\n3️⃣ Testing performance...');
  try {
    const template = '<p>{{name}} - {{price}}</p>'.repeat(100);
    const data = { name: 'Product', price: '99.99' };
    
    const startTime = Date.now();
    const result = variableReplacer.replaceVariables(template, data);
    const endTime = Date.now();
    
    if (result.success && (endTime - startTime) < 100) {
      console.log(`   ✅ Performance good: ${endTime - startTime}ms`);
      passed++;
    } else {
      console.log(`   ⚠️  Performance slow: ${endTime - startTime}ms`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Test 4: Error Handling
  console.log('\n4️⃣ Testing error handling...');
  try {
    const result = variableReplacer.replaceVariables(
      null, // Invalid template
      { data: 'test' }
    );
    
    if (!result.success && result.error) {
      console.log('   ✅ Invalid input properly handled');
      passed++;
    } else {
      console.log('   ❌ Invalid input not handled');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Test 5: Memory Management
  console.log('\n5️⃣ Testing memory management...');
  try {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process many templates
    for (let i = 0; i < 50; i++) {
      variableReplacer.replaceVariables(
        '<p>{{item}}</p>'.repeat(20),
        { item: `Item ${i}` }
      );
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = Math.round((finalMemory - initialMemory) / 1024);
    
    if (memoryIncrease < 5000) { // Less than 5MB increase
      console.log(`   ✅ Memory usage acceptable: +${memoryIncrease}KB`);
      passed++;
    } else {
      console.log(`   ⚠️  Memory usage high: +${memoryIncrease}KB`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Test 6: Complex Nested Data
  console.log('\n6️⃣ Testing nested data handling...');
  try {
    const complexData = {
      company: {
        name: 'Acme Corp',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA'
        }
      },
      contact: {
        person: {
          firstName: 'John',
          lastName: 'Doe'
        }
      }
    };
    
    const result = variableReplacer.replaceVariables(
      '<p>{{company.name}} - {{company.address.city}}, {{company.address.state}}</p><p>Contact: {{contact.person.firstName}} {{contact.person.lastName}}</p>',
      complexData
    );
    
    if (result.success && result.statistics.replacedVariables === 5) {
      console.log(`   ✅ Nested data handled: ${result.statistics.replacedVariables}/5 variables`);
      passed++;
    } else {
      console.log(`   ❌ Nested data failed: ${result.statistics.replacedVariables}/5 variables`);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    failed++;
  }

  // Results
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All production tests passed! Variable replacement system is production-ready.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review before production deployment.`);
  }

  return { passed, failed };
}

// Run tests
runSimpleProductionTests().catch(console.error);