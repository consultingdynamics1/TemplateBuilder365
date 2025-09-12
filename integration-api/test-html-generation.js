#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { handler } = require('./functions/tb365-converter');
const { htmlGenerator } = require('./services/html-generator');

/**
 * Test script for the new HTML generation system
 */

async function testHtmlGeneration() {
  console.log('🚀 TB365 Complete HTML Generation Test');
  console.log('=====================================\n');
  
  try {
    // Step 1: Set output mode to response-only for testing
    console.log('1️⃣ Setting up response-only mode...');
    const configResult = await handler({
      httpMethod: 'POST',
      path: '/output-config',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'dev-api-key-change-me'
      },
      body: JSON.stringify({ outputMode: 'response-only' })
    });
    
    if (configResult.statusCode === 200) {
      console.log('✅ Output mode set to response-only\n');
    }

    // Step 2: Run conversion
    console.log('2️⃣ Running HTML conversion...');
    const testEventPath = path.join(__dirname, 'test-simple-conversion.json');
    const testEvent = JSON.parse(fs.readFileSync(testEventPath, 'utf8'));
    
    const startTime = Date.now();
    const result = await handler(testEvent);
    const duration = Date.now() - startTime;
    
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Status: ${result.statusCode}\n`);
    
    if (result.statusCode !== 200) {
      console.log('❌ Conversion failed');
      const errorData = JSON.parse(result.body);
      console.log(`   Error: ${errorData.error.message}`);
      return;
    }

    // Step 3: Analyze the HTML result
    const responseData = JSON.parse(result.body);
    const { data } = responseData;
    
    console.log('✅ HTML Generation Successful!');
    console.log('===============================\n');
    
    console.log('📊 Generation Summary:');
    console.log(`   Conversion ID: ${data.conversionId}`);
    console.log(`   Output Mode: ${data.outputMode}`);
    console.log(`   Original Elements: ${data.originalProject.elements}`);
    console.log(`   Original Variables: ${data.originalProject.variables}`);
    console.log(`   Generated HTML Size: ${data.generatedHtml.sizeKB} KB (${data.generatedHtml.size} bytes)`);
    console.log(`   HTML Variables: ${data.generatedHtml.variables}`);
    console.log(`   Complexity: ${data.generatedHtml.complexity}`);
    console.log(`   Generation Time: ${data.generatedHtml.generationTime}\n`);

    // Step 4: Examine HTML structure
    const htmlResult = data.htmlResult;
    console.log('🏗️  HTML Structure Analysis:');
    console.log('============================');
    console.log(`   Project Name: ${htmlResult.metadata.projectName}`);
    console.log(`   Canvas Size: ${htmlResult.metadata.canvasSize.width}x${htmlResult.metadata.canvasSize.height}`);
    console.log(`   Generated At: ${htmlResult.metadata.generatedAt}\n`);

    // Step 5: Show HTML preview (first 1000 chars)
    console.log('📄 Generated HTML Preview:');
    console.log('===========================');
    const htmlPreview = htmlResult.html.substring(0, 1000);
    const lines = htmlPreview.split('\n');
    lines.forEach((line, index) => {
      console.log(`   ${String(index + 1).padStart(2)}: ${line}`);
    });
    console.log(`   ... (${htmlResult.html.length - 1000} more characters)\n`);

    // Step 6: Show data structure
    console.log('📊 Data Structure:');
    console.log('==================');
    console.log(`   Variables: ${Object.keys(htmlResult.data.variables).length}`);
    console.log(`   Default Values: ${Object.keys(htmlResult.data.defaultValues).length}`);
    console.log(`   Schema Properties: ${Object.keys(htmlResult.data.schema.properties).length}\n`);

    Object.entries(htmlResult.data.variables).forEach(([name, variable]) => {
      console.log(`   Variable: ${name}`);
      console.log(`     Type: ${variable.type}`);
      console.log(`     Description: ${variable.description}`);
      console.log(`     Default: "${htmlResult.data.defaultValues[name]}"`);
      console.log(`     Category: ${variable.category}`);
      console.log(`     Required: ${variable.required}\n`);
    });

    // Step 7: Test variable replacement
    console.log('🔄 Testing Variable Replacement:');
    console.log('================================');
    
    const testData = {
      property: {
        city: 'San Francisco',
        state: 'California'
      }
    };
    
    const replacedHtml = htmlGenerator.replaceVariables(
      htmlResult.html, 
      testData, 
      htmlResult.data.defaultValues
    );
    
    console.log('   Sample data:', JSON.stringify(testData, null, 2));
    console.log(`   HTML before replacement: ${htmlResult.html.length} chars`);
    console.log(`   HTML after replacement: ${replacedHtml.length} chars`);
    
    // Show the replaced content snippet
    const beforeSnippet = htmlResult.html.match(/{{[^}]+}}/g) || [];
    console.log(`   Variables found: ${beforeSnippet.length}`);
    beforeSnippet.forEach(variable => {
      console.log(`     - ${variable}`);
    });
    
    const afterSnippet = replacedHtml.match(/San Francisco|California/g) || [];
    console.log(`   Replacements made: ${afterSnippet.length}`);
    console.log(`   Replaced values: ${afterSnippet.join(', ')}\n`);

    // Step 8: Save test outputs
    console.log('💾 Saving Test Outputs:');
    console.log('========================');
    
    const outputDir = path.join(__dirname, 'test-html-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Save original template
    const templatePath = path.join(outputDir, 'template.html');
    fs.writeFileSync(templatePath, htmlResult.html, 'utf8');
    console.log(`   ✅ Saved template: ${templatePath}`);
    
    // Save replaced HTML
    const replacedPath = path.join(outputDir, 'replaced.html');
    fs.writeFileSync(replacedPath, replacedHtml, 'utf8');
    console.log(`   ✅ Saved replaced HTML: ${replacedPath}`);
    
    // Save data
    const dataPath = path.join(outputDir, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify(htmlResult.data, null, 2), 'utf8');
    console.log(`   ✅ Saved data: ${dataPath}`);
    
    console.log('\n🎉 HTML Generation Test Complete!');
    console.log('\nNext Steps:');
    console.log('   1. Open test-html-output/template.html in a browser');
    console.log('   2. Open test-html-output/replaced.html to see with data');
    console.log('   3. Review data.json for variable structure');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testHtmlGeneration();