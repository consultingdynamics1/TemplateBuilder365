#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { handler } = require('./functions/tb365-converter');

/**
 * Simple test script for TB365 conversion in response-only mode
 */

async function runSimpleTest() {
  console.log('🚀 TB365 Simple Conversion Test');
  console.log('=====================================\n');
  
  try {
    // Set output mode to response-only first
    console.log('1️⃣ Setting OUTPUT_MODE to response-only...');
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
    } else {
      console.log('❌ Failed to set output mode');
      return;
    }

    // Load test data
    console.log('2️⃣ Loading simple test data...');
    const testEventPath = path.join(__dirname, 'test-simple-conversion.json');
    const testEvent = JSON.parse(fs.readFileSync(testEventPath, 'utf8'));
    
    const testData = JSON.parse(testEvent.body).tb365Data;
    console.log(`   Project: ${testData.projectName}`);
    console.log(`   Elements: ${testData.canvasState.elements.length}`);
    console.log(`   Canvas Size: ${testData.canvasState.canvasSize.width}x${testData.canvasState.canvasSize.height}`);
    
    // Show test elements
    console.log('\n📋 Test Elements:');
    testData.canvasState.elements.forEach((element, index) => {
      console.log(`   ${index + 1}. ${element.type} "${element.name}"`);
      if (element.content) {
        console.log(`      Content: "${element.content}"`);
      }
      if (element.fill) {
        console.log(`      Fill: ${element.fill}`);
      }
    });
    console.log('');

    // Run conversion
    console.log('3️⃣ Running TB365 conversion...');
    const startTime = Date.now();
    const result = await handler(testEvent);
    const duration = Date.now() - startTime;
    
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Status: ${result.statusCode}\n`);
    
    if (result.statusCode === 200) {
      const responseData = JSON.parse(result.body);
      const { data } = responseData;
      
      console.log('✅ Conversion Successful!');
      console.log('=========================\n');
      
      console.log('📊 Conversion Summary:');
      console.log(`   Conversion ID: ${data.conversionId}`);
      console.log(`   Output Mode: ${data.outputMode}`);
      console.log(`   Elements Processed: ${data.originalProject.elements}`);
      console.log(`   Variables Found: ${data.originalProject.variables}`);
      console.log(`   Generated Components: ${data.apiTemplateProject.components}`);
      console.log(`   API Variables: ${data.apiTemplateProject.variables}`);
      console.log(`   Complexity: ${data.apiTemplateProject.complexity}\n`);
      
      // Show output files
      if (data.output && data.output.convertedData) {
        const files = data.output.convertedData;
        console.log('📁 Generated Files:');
        console.log(`   File Count: ${data.output.fileCount}`);
        console.log(`   Data Sizes: Project=${Math.round(data.output.dataSize.project / 1024)}KB, CSS=${Math.round(data.output.dataSize.css / 1024)}KB, Data=${Math.round(data.output.dataSize.data / 1024)}KB\n`);
        
        // Show project.json structure
        console.log('🏗️  PROJECT.JSON:');
        console.log('================');
        const project = files['project.json'];
        console.log(`   Name: ${project.name}`);
        console.log(`   Format: ${project.template.format}`);
        console.log(`   Dimensions: ${project.template.width}x${project.template.height}`);
        console.log(`   Objects: ${Object.keys(project.template.objects).length}`);
        console.log(`   Variables: ${Object.keys(project.data.variables).length}`);
        
        console.log('\n   Template Objects:');
        Object.entries(project.template.objects).forEach(([id, obj]) => {
          console.log(`     - ${id}: ${obj.type} "${obj.name}" at (${obj.position.x},${obj.position.y})`);
        });
        
        console.log('\n   Data Variables:');
        Object.entries(project.data.variables).forEach(([name, variable]) => {
          console.log(`     - ${name}: ${variable.type} (${variable.description})`);
        });
        
        // Show css.json structure
        console.log('\n🎨 CSS.JSON:');
        console.log('============');
        const css = files['css.json'];
        console.log(`   Object Count: ${css.objectCount}`);
        console.log(`   CSS Length: ${css.css.length} characters`);
        console.log('\n   Generated CSS (first 500 chars):');
        console.log(`   ${css.css.substring(0, 500)}...`);
        
        // Show data.json structure  
        console.log('\n📊 DATA.JSON:');
        console.log('=============');
        const dataFile = files['data.json'];
        console.log(`   Total Variables: ${dataFile.statistics.totalVariables}`);
        console.log(`   Original Elements: ${dataFile.statistics.originalElements}`);
        
        console.log('\n   Variables with Defaults:');
        Object.entries(dataFile.variables).forEach(([name, variable]) => {
          const defaultValue = dataFile.defaultValues[name];
          console.log(`     - ${name}: "${defaultValue}" (${variable.type})`);
        });
        
        console.log('\n   JSON Schema Properties:');
        Object.entries(dataFile.schema.properties).forEach(([name, schema]) => {
          console.log(`     - ${name}: ${schema.type} - "${schema.description}"`);
        });
        
      }
    } else {
      console.log('❌ Conversion Failed');
      const errorData = JSON.parse(result.body);
      console.log(`   Error: ${errorData.error.message}`);
      if (errorData.error.details) {
        console.log('   Details:', errorData.error.details);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
runSimpleTest();