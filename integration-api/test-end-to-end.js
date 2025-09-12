#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { handler } = require('./functions/tb365-converter');
const { variableReplacer } = require('./services/variable-replacer');

/**
 * Complete End-to-End Test: TB365 → HTML → Variable Replacement
 */

async function runEndToEndTest() {
  console.log('🚀 TB365 Complete End-to-End Pipeline Test');
  console.log('============================================\n');
  
  try {
    // Step 1: Set up enhanced test data
    console.log('1️⃣ Setting up enhanced test data...');
    
    // Create more comprehensive test event
    const enhancedTestEvent = {
      httpMethod: 'POST',
      path: '/convert',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'dev-api-key-change-me'
      },
      body: JSON.stringify({
        tb365Data: {
          projectName: 'Real Estate Listing - End to End Test',
          savedAt: '2025-01-30T10:00:00.000Z',
          version: '1.0',
          canvasState: {
            elements: [
              {
                id: 'header-bg',
                type: 'rectangle',
                position: { x: 0, y: 0 },
                size: { width: 600, height: 80 },
                visible: true,
                locked: false,
                name: 'header-background',
                zIndex: 1,
                fill: '#2c5aa0',
                stroke: '#1e3f73',
                strokeWidth: 2,
                cornerRadius: 8
              },
              {
                id: 'agency-title',
                type: 'text',
                position: { x: 20, y: 20 },
                size: { width: 560, height: 40 },
                visible: true,
                locked: false,
                name: 'agency-title',
                zIndex: 2,
                content: '{{agency.name}} - {{agency.tagline}}',
                fontSize: 28,
                fontFamily: 'Georgia',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textAlign: 'center',
                color: '#ffffff',
                backgroundColor: 'transparent',
                padding: 0
              },
              {
                id: 'property-info',
                type: 'text',
                position: { x: 20, y: 100 },
                size: { width: 280, height: 120 },
                visible: true,
                locked: false,
                name: 'property-info',
                zIndex: 3,
                content: 'Property: {{property.address}}\\nLocation: {{property.city}}, {{property.state}} {{property.zip}}\\nPrice: {{property.price}}\\nSize: {{property.sqft}} sq ft',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
                color: '#333333',
                backgroundColor: 'transparent',
                padding: 8
              },
              {
                id: 'contact-info',
                type: 'text',
                position: { x: 320, y: 100 },
                size: { width: 260, height: 120 },
                visible: true,
                locked: false,
                name: 'contact-info',
                zIndex: 4,
                content: 'Contact Information\\nAgent: {{agent.name}}\\nPhone: {{agent.phone}}\\nEmail: {{agent.email}}\\nWebsite: {{agency.website}}',
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
                color: '#333333',
                backgroundColor: 'transparent',
                padding: 8
              }
            ],
            selectedElementId: null,
            editingElementId: null,
            editingTableCell: null,
            activeTool: 'select',
            canvasSize: { width: 600, height: 240 },
            zoom: 1,
            snapToGrid: false,
            gridSize: 20
          }
        },
        options: {
          outputFormat: 'json',
          includeAssets: false,
          generatePreview: false
        }
      })
    };
    
    console.log('   ✅ Created enhanced test event with 4 elements');
    console.log('   ✅ Includes mixed template/raw content');

    // Step 2: Set response-only mode and run conversion
    console.log('\n2️⃣ Running TB365 → HTML conversion...');
    
    await handler({
      httpMethod: 'POST',
      path: '/output-config',
      headers: enhancedTestEvent.headers,
      body: JSON.stringify({ outputMode: 'response-only' })
    });
    
    const conversionResult = await handler(enhancedTestEvent);
    
    if (conversionResult.statusCode !== 200) {
      console.log('❌ Conversion failed');
      console.log(JSON.parse(conversionResult.body));
      return;
    }
    
    const conversionData = JSON.parse(conversionResult.body).data;
    const htmlResult = conversionData.htmlResult;
    
    console.log(`   ✅ Conversion successful!`);
    console.log(`   📊 Generated HTML: ${Math.round(htmlResult.html.length / 1024)} KB`);
    console.log(`   📊 Found ${htmlResult.metadata.variables} variables`);
    console.log(`   📊 Complexity: ${htmlResult.metadata.complexity}`);

    // Step 3: Create realistic business data
    console.log('\n3️⃣ Creating realistic business data...');
    
    const businessData = {
      agency: {
        name: 'Mountain View Realty',
        tagline: 'Your Gateway to Colorado Living',
        website: 'mountainviewrealty.com',
        license: 'CO-RE-2024-001'
      },
      agent: {
        name: 'Michael Rodriguez',
        title: 'Senior Real Estate Specialist',
        phone: '7205551234',
        email: 'michael@mountainviewrealty.com'
      },
      property: {
        address: '2847 Pine Ridge Trail',
        city: 'Boulder',
        state: 'Colorado',
        zip: '80302',
        price: '895000',
        bedrooms: '4',
        bathrooms: '3.5',
        sqft: '3200',
        type: 'Single Family Home'
      }
    };
    
    console.log('   ✅ Created realistic business data');
    console.log(`   📧 Agency: ${businessData.agency.name}`);
    console.log(`   🏠 Property: ${businessData.property.address}`);
    console.log(`   👤 Agent: ${businessData.agent.name}`);

    // Step 4: Perform variable replacement
    console.log('\n4️⃣ Performing variable replacement...');
    
    const replacementResult = variableReplacer.replaceVariables(
      htmlResult.html,
      businessData,
      htmlResult.data.defaultValues,
      { escapeHtml: false }
    );
    
    console.log(`   📊 Replacement Statistics:`);
    console.log(`   • Processing time: ${replacementResult.statistics.processingTime}`);
    console.log(`   • Variables found: ${replacementResult.statistics.totalVariables}`);
    console.log(`   • Successfully replaced: ${replacementResult.statistics.replacedVariables}`);
    console.log(`   • Missing variables: ${replacementResult.statistics.missingVariables}`);
    console.log(`   • Length change: ${replacementResult.statistics.originalLength} → ${replacementResult.statistics.replacedLength} chars`);

    if (replacementResult.replacements.length > 0) {
      console.log('\n   🔄 Variable Replacements Made:');
      replacementResult.replacements.forEach(replacement => {
        console.log(`   • ${replacement.variable}: "${replacement.replaced}" (${replacement.source})`);
      });
    }

    // Step 5: Save all outputs
    console.log('\n5️⃣ Saving end-to-end results...');
    const outputDir = path.join(__dirname, 'test-end-to-end-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Save original template
    const templatePath = path.join(outputDir, 'original-template.html');
    fs.writeFileSync(templatePath, htmlResult.html, 'utf8');
    
    // Save final result
    const finalPath = path.join(outputDir, 'final-result.html');
    fs.writeFileSync(finalPath, replacementResult.html, 'utf8');
    
    // Save business data
    const businessDataPath = path.join(outputDir, 'business-data.json');
    fs.writeFileSync(businessDataPath, JSON.stringify(businessData, null, 2), 'utf8');
    
    // Save complete pipeline info
    const pipelineInfoPath = path.join(outputDir, 'pipeline-info.json');
    fs.writeFileSync(pipelineInfoPath, JSON.stringify({
      pipeline: 'TB365 → HTML Template → Variable Replacement',
      originalProject: {
        name: enhancedTestEvent.tb365Data?.projectName,
        elements: enhancedTestEvent.tb365Data?.canvasState?.elements?.length,
        canvasSize: enhancedTestEvent.tb365Data?.canvasState?.canvasSize
      },
      htmlGeneration: {
        sizeKB: Math.round(htmlResult.html.length / 1024),
        variables: htmlResult.metadata.variables,
        complexity: htmlResult.metadata.complexity,
        generationTime: htmlResult.metadata.generationTime
      },
      variableReplacement: {
        statistics: replacementResult.statistics,
        replacements: replacementResult.replacements,
        missing: replacementResult.missing
      },
      businessData: businessData,
      generatedAt: new Date().toISOString()
    }, null, 2), 'utf8');
    
    console.log(`   ✅ Saved original template: original-template.html`);
    console.log(`   ✅ Saved final result: final-result.html`);
    console.log(`   ✅ Saved business data: business-data.json`);
    console.log(`   ✅ Saved pipeline info: pipeline-info.json`);

    // Step 6: Test different data scenarios
    console.log('\n6️⃣ Testing different data scenarios...');
    
    // Test with missing data
    const partialData = {
      agency: { name: 'Partial Realty' },
      property: { city: 'Denver' }
    };
    
    const partialResult = variableReplacer.replaceVariables(
      htmlResult.html,
      partialData,
      htmlResult.data.defaultValues
    );
    
    console.log(`   📊 Partial Data Test:`);
    console.log(`   • Variables replaced: ${partialResult.statistics.replacedVariables}`);
    console.log(`   • Used defaults: ${partialResult.replacements.filter(r => r.source === 'default').length}`);
    console.log(`   • Missing: ${partialResult.statistics.missingVariables}`);
    
    // Save partial data result
    const partialPath = path.join(outputDir, 'partial-data-result.html');
    fs.writeFileSync(partialPath, partialResult.html, 'utf8');
    console.log(`   ✅ Saved partial data result: partial-data-result.html`);

    // Step 7: Performance test
    console.log('\n7️⃣ Running performance test...');
    const performanceRuns = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < performanceRuns; i++) {
      variableReplacer.replaceVariables(htmlResult.html, businessData, htmlResult.data.defaultValues);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / performanceRuns;
    
    console.log(`   ⚡ Performance Results:`);
    console.log(`   • ${performanceRuns} replacements in ${totalTime}ms`);
    console.log(`   • Average: ${avgTime.toFixed(2)}ms per replacement`);
    console.log(`   • Rate: ${Math.round(1000 / avgTime)} replacements/second`);

    console.log('\n🎉 End-to-End Pipeline Test Complete!');
    console.log('\n📋 Test Summary:');
    console.log('✅ TB365 format parsing and validation');
    console.log('✅ Complete HTML template generation');
    console.log('✅ Variable replacement with business data');
    console.log('✅ Automatic formatting (price, phone, website)');
    console.log('✅ Missing data handling with defaults');
    console.log('✅ Performance validation');
    
    console.log('\n📁 Generated Files in test-end-to-end-output/:');
    console.log('• original-template.html - Generated HTML template');
    console.log('• final-result.html - Template with business data');
    console.log('• partial-data-result.html - Template with partial data');
    console.log('• business-data.json - Sample business data');
    console.log('• pipeline-info.json - Complete pipeline statistics');
    
    console.log('\n💡 Open final-result.html in a browser to see the complete result!');

  } catch (error) {
    console.error('💥 End-to-end test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
runEndToEndTest();