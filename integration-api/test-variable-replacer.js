#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { variableReplacer } = require('./services/variable-replacer');

/**
 * Test script for the Variable Replacer Engine
 */

async function testVariableReplacer() {
  console.log('🚀 TB365 Variable Replacement Engine Test');
  console.log('==========================================\n');
  
  try {
    // Step 1: Load template HTML
    console.log('1️⃣ Loading HTML template...');
    const templatePath = path.join(__dirname, 'test-html-output', 'template.html');
    
    if (!fs.existsSync(templatePath)) {
      console.log('❌ Template not found. Run test-html-generation.js first');
      return;
    }
    
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    console.log(`   ✅ Loaded template: ${Math.round(htmlTemplate.length / 1024)} KB`);

    // Step 2: Load data structure  
    const dataPath = path.join(__dirname, 'test-html-output', 'data.json');
    const dataStructure = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`   ✅ Loaded data structure with ${Object.keys(dataStructure.variables).length} variables\n`);

    // Step 3: Create comprehensive sample data
    console.log('2️⃣ Creating sample data...');
    const sampleData = {
      // Agency information
      agency: {
        name: "Sunset Realty",
        website: "sunsetrealty.com",
        tagline: "Your Trusted Real Estate Partner",
        license: "RE License #SR-12345"
      },
      
      // Agent information  
      agent: {
        name: "Sarah Johnson",
        title: "Senior Real Estate Agent",
        phone: "3035550123",
        email: "sarah@sunsetrealty.com"
      },
      
      // Property information
      property: {
        address: "1245 Highland Drive",
        city: "Denver",
        state: "Colorado", 
        zip: "80202",
        price: "750000",
        bedrooms: "4",
        bathrooms: "3",
        sqft: "2400",
        description: "Stunning modern home with mountain views"
      },
      
      // Neighborhood information
      neighborhood: {
        school: "Denver Public Schools",
        walkScore: "85",
        shopping: "Cherry Creek Mall nearby",
        parks: "Cheesman Park (0.5 miles)"
      }
    };
    
    // Also test flat data format 
    const flatSampleData = {
      "agency.name": "Sunset Realty",
      "property.city": "Denver",
      "property.state": "Colorado",
      "property.zip": "80202", 
      "agent.phone": "(303) 555-0123",
      "agency.website": "https://sunsetrealty.com",
      "property.price": "$750,000",
      "property.sqft": "2,400"
    };

    console.log('   ✅ Created nested sample data');
    console.log('   ✅ Created flat sample data\n');

    // Step 4: Analyze template before replacement
    console.log('3️⃣ Analyzing template variables...');
    const analysis = variableReplacer.analyzeTemplate(
      htmlTemplate, 
      sampleData, 
      dataStructure.defaultValues
    );
    
    console.log(`   📊 Template Analysis:`);
    console.log(`      Total variable instances: ${analysis.totalInstances}`);
    console.log(`      Unique variables: ${analysis.uniqueVariables}`);
    console.log(`      Data coverage: ${analysis.dataAvailability.coveragePercent}%`);
    console.log(`      Found in data: ${analysis.dataAvailability.foundInData}`);
    console.log(`      Found in defaults: ${analysis.dataAvailability.foundInDefaults}`);
    console.log(`      Missing: ${analysis.dataAvailability.missing}`);
    
    console.log('\n   🏷️  Variable Categories:');
    Object.entries(analysis.categories).forEach(([category, count]) => {
      console.log(`      ${category}: ${count} variables`);
    });
    
    console.log('\n   📝 Variables in template:');
    analysis.variableList.forEach(variable => {
      console.log(`      - ${variable}`);
    });

    // Step 5: Preview replacements
    console.log('\n4️⃣ Previewing replacements...');
    const preview = variableReplacer.previewReplacements(
      htmlTemplate,
      sampleData,
      dataStructure.defaultValues
    );
    
    preview.forEach(item => {
      const status = item.found ? '✅' : '❌';
      const source = item.source ? `(${item.source})` : '';
      console.log(`   ${status} ${item.variable}: "${item.current}" → "${item.willBecome}" ${source}`);
    });

    // Step 6: Test with nested data
    console.log('\n5️⃣ Testing replacement with nested data...');
    const nestedResult = variableReplacer.replaceVariables(
      htmlTemplate,
      sampleData,
      dataStructure.defaultValues,
      { escapeHtml: false }
    );
    
    console.log(`   📊 Replacement Statistics:`);
    console.log(`      Processing time: ${nestedResult.statistics.processingTime}`);
    console.log(`      Original length: ${nestedResult.statistics.originalLength} chars`);
    console.log(`      Replaced length: ${nestedResult.statistics.replacedLength} chars`);
    console.log(`      Total variables: ${nestedResult.statistics.totalVariables}`);
    console.log(`      Successfully replaced: ${nestedResult.statistics.replacedVariables}`);
    console.log(`      Missing variables: ${nestedResult.statistics.missingVariables}`);
    
    if (nestedResult.replacements.length > 0) {
      console.log('\n   🔄 Successful Replacements:');
      nestedResult.replacements.forEach(replacement => {
        console.log(`      ${replacement.variable}: "${replacement.replaced}" (${replacement.source})`);
      });
    }
    
    if (nestedResult.missing.length > 0) {
      console.log('\n   ⚠️  Missing Variables:');
      nestedResult.missing.forEach(missing => {
        console.log(`      ${missing.variable}: ${missing.fullMatch}`);
      });
    }

    // Step 7: Test with flat data
    console.log('\n6️⃣ Testing replacement with flat data...');
    const flatResult = variableReplacer.replaceVariables(
      htmlTemplate,
      flatSampleData,
      dataStructure.defaultValues
    );
    
    console.log(`   📊 Flat Data Results:`);
    console.log(`      Successfully replaced: ${flatResult.statistics.replacedVariables}`);
    console.log(`      Missing variables: ${flatResult.statistics.missingVariables}`);

    // Step 8: Save results
    console.log('\n7️⃣ Saving replacement results...');
    const outputDir = path.join(__dirname, 'test-variable-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Save nested data result
    const nestedPath = path.join(outputDir, 'nested-data-result.html');
    fs.writeFileSync(nestedPath, nestedResult.html, 'utf8');
    console.log(`   ✅ Saved nested data result: ${nestedPath}`);
    
    // Save flat data result
    const flatPath = path.join(outputDir, 'flat-data-result.html');
    fs.writeFileSync(flatPath, flatResult.html, 'utf8');
    console.log(`   ✅ Saved flat data result: ${flatPath}`);
    
    // Save sample data for reference
    const sampleDataPath = path.join(outputDir, 'sample-data.json');
    fs.writeFileSync(sampleDataPath, JSON.stringify({
      nested: sampleData,
      flat: flatSampleData,
      analysis: analysis,
      nestedResult: {
        statistics: nestedResult.statistics,
        replacements: nestedResult.replacements,
        missing: nestedResult.missing
      }
    }, null, 2), 'utf8');
    console.log(`   ✅ Saved sample data and results: ${sampleDataPath}`);

    // Step 9: Test formatting features
    console.log('\n8️⃣ Testing automatic formatting...');
    const formattingTestData = {
      "property.price": "750000",           // Should become $750,000
      "agent.phone": "3035550123",          // Should become (303) 555-0123  
      "agency.website": "sunsetrealty.com", // Should become https://sunsetrealty.com
      "property.sqft": "2400"               // Should become 2,400 sq ft
    };
    
    // Create a simple test template
    const formattingTemplate = `
    <div>
      <p>Price: {{property.price}}</p>
      <p>Phone: {{agent.phone}}</p>  
      <p>Website: {{agency.website}}</p>
      <p>Size: {{property.sqft}}</p>
    </div>`;
    
    const formattingResult = variableReplacer.replaceVariables(
      formattingTemplate,
      formattingTestData,
      {},
      { escapeHtml: false }
    );
    
    console.log('   🎨 Formatting Examples:');
    formattingResult.replacements.forEach(replacement => {
      console.log(`      ${replacement.variable}: "${replacement.original}" → "${replacement.replaced}"`);
    });
    
    // Save formatting test
    const formattingPath = path.join(outputDir, 'formatting-test.html');
    fs.writeFileSync(formattingPath, formattingResult.html, 'utf8');
    console.log(`   ✅ Saved formatting test: ${formattingPath}`);

    console.log('\n🎉 Variable Replacement Engine Test Complete!');
    console.log('\n📁 Generated Files:');
    console.log('   • nested-data-result.html - Template with nested data structure');
    console.log('   • flat-data-result.html - Template with flat data structure');  
    console.log('   • formatting-test.html - Automatic formatting examples');
    console.log('   • sample-data.json - All test data and results');
    console.log('\n💡 Open the HTML files in a browser to see the results!');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testVariableReplacer();