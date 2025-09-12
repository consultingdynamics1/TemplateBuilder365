#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { handler } = require('./functions/tb365-converter');

/**
 * Test script for TB365 conversion with local file output
 * Inspects actual generated files in /tmp/test-output/
 */

async function runLocalFileTest() {
  console.log('🚀 TB365 Local File Output Test');
  console.log('==================================\n');
  
  try {
    // Step 1: Set output mode to local
    console.log('1️⃣ Setting OUTPUT_MODE to local...');
    const configResult = await handler({
      httpMethod: 'POST',
      path: '/output-config',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'dev-api-key-change-me'
      },
      body: JSON.stringify({ outputMode: 'local' })
    });
    
    if (configResult.statusCode === 200) {
      console.log('✅ Output mode set to local\n');
    } else {
      console.log('❌ Failed to set output mode');
      return;
    }

    // Step 2: Load and run conversion
    console.log('2️⃣ Running conversion with simple test data...');
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

    // Step 3: Extract file information from response
    const responseData = JSON.parse(result.body);
    const { data } = responseData;
    
    console.log('✅ Conversion successful!');
    console.log(`   Conversion ID: ${data.conversionId}`);
    console.log(`   Output Directory: ${data.output.outputDirectory}\n`);

    // Step 4: Read and display actual files
    console.log('3️⃣ Reading generated files from disk...');
    
    const outputDir = data.output.outputDirectory;
    const filePaths = data.output.localPaths;
    
    // Check if directory exists
    if (!fs.existsSync(outputDir)) {
      console.log(`❌ Output directory does not exist: ${outputDir}`);
      return;
    }

    console.log(`   Directory: ${outputDir}`);
    console.log(`   Files: ${Object.keys(filePaths).length}\n`);

    // Read and display each file
    for (const [fileType, filePath] of Object.entries(filePaths)) {
      await displayFileContents(fileType, filePath);
    }

    // Step 5: Validate file structure for APITemplate.io
    console.log('4️⃣ Validating APITemplate.io format...');
    await validateApiTemplateFormat(filePaths);

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error(error.stack);
  }
}

/**
 * Display file contents with formatting
 */
async function displayFileContents(fileType, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return;
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`📁 ${fileType.toUpperCase()}.JSON`);
    console.log(`${'='.repeat(fileType.length + 5)}`);
    console.log(`   Path: ${filePath}`);
    console.log(`   Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
    console.log(`   Created: ${stats.mtime.toISOString()}\n`);

    switch (fileType) {
      case 'project':
        displayProjectFile(data);
        break;
      case 'css':
        displayCssFile(data);
        break;
      case 'data':
        displayDataFile(data);
        break;
      default:
        console.log('   Raw Content:');
        console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('\n');
  } catch (error) {
    console.log(`❌ Error reading ${fileType}: ${error.message}`);
  }
}

/**
 * Display project.json structure
 */
function displayProjectFile(data) {
  console.log('   📋 Project Structure:');
  console.log(`     Name: ${data.name}`);
  console.log(`     Version: ${data.version}`);
  console.log(`     Format: ${data.template.format}`);
  console.log(`     Dimensions: ${data.template.width}x${data.template.height}`);
  console.log(`     Generated: ${data.generatedAt}`);

  console.log('\n   🧱 Template Objects:');
  Object.entries(data.template.objects).forEach(([id, obj]) => {
    console.log(`     - ${id}:`);
    console.log(`       Type: ${obj.type}`);
    console.log(`       Name: "${obj.name}"`);
    console.log(`       Position: (${obj.position.x}, ${obj.position.y})`);
    console.log(`       Size: ${obj.size.width}x${obj.size.height}`);
    console.log(`       Z-Index: ${obj.zIndex}`);
    console.log(`       Visible: ${obj.visible}`);
  });

  console.log('\n   📄 HTML Structure:');
  const htmlLines = data.template.html.split('\n');
  const relevantLines = htmlLines.filter(line => 
    line.trim() && 
    !line.includes('<!DOCTYPE') && 
    !line.includes('<html') && 
    !line.includes('<head') && 
    !line.includes('<style>')
  ).slice(0, 15);
  
  relevantLines.forEach(line => {
    console.log(`     ${line.trim()}`);
  });
  
  if (htmlLines.length > 15) {
    console.log(`     ... (${htmlLines.length - 15} more lines)`);
  }

  console.log('\n   🔗 Data Variables:');
  Object.entries(data.data.variables).forEach(([name, variable]) => {
    console.log(`     - ${name}: ${variable.type} (${variable.description})`);
  });
}

/**
 * Display css.json structure  
 */
function displayCssFile(data) {
  console.log('   🎨 CSS Structure:');
  console.log(`     Object Count: ${data.objectCount}`);
  console.log(`     CSS Length: ${data.css.length} characters`);
  console.log(`     Generated: ${data.generatedAt}`);

  console.log('\n   📐 CSS Rules (sample):');
  const cssLines = data.css.split('\n').filter(line => line.trim());
  const sampleLines = cssLines.slice(0, 20);
  
  sampleLines.forEach(line => {
    console.log(`     ${line}`);
  });
  
  if (cssLines.length > 20) {
    console.log(`     ... (${cssLines.length - 20} more lines)`);
  }
}

/**
 * Display data.json structure
 */
function displayDataFile(data) {
  console.log('   📊 Data Structure:');
  console.log(`     Total Variables: ${data.statistics.totalVariables}`);
  console.log(`     Original Elements: ${data.statistics.originalElements}`);
  console.log(`     Generated: ${data.generatedAt}`);

  console.log('\n   🏷️  Variables:');
  Object.entries(data.variables).forEach(([name, variable]) => {
    console.log(`     - ${name}:`);
    console.log(`       Type: ${variable.type}`);
    console.log(`       Description: "${variable.description}"`);
    console.log(`       Category: ${variable.category}`);
    console.log(`       Required: ${variable.required}`);
  });

  console.log('\n   📝 Default Values:');
  Object.entries(data.defaultValues).forEach(([name, value]) => {
    console.log(`     - ${name}: "${value}"`);
  });

  console.log('\n   📋 JSON Schema:');
  console.log(`     Type: ${data.schema.type}`);
  console.log(`     Properties: ${Object.keys(data.schema.properties).length}`);
  console.log(`     Required: ${data.schema.required.length}`);
  
  console.log('\n   🏗️  Schema Properties:');
  Object.entries(data.schema.properties).forEach(([name, prop]) => {
    console.log(`     - ${name}: ${prop.type} "${prop.description}"`);
    console.log(`       Default: "${prop.default}"`);
  });
}

/**
 * Validate APITemplate.io format compatibility
 */
async function validateApiTemplateFormat(filePaths) {
  const issues = [];
  
  try {
    // Validate project.json
    const projectData = JSON.parse(fs.readFileSync(filePaths.project, 'utf8'));
    
    if (!projectData.name) issues.push('❌ Project missing name');
    if (!projectData.template) issues.push('❌ Project missing template section');
    if (!projectData.template.html) issues.push('❌ Template missing HTML');
    if (!projectData.template.objects) issues.push('❌ Template missing objects');
    if (!projectData.data) issues.push('❌ Project missing data section');
    if (!projectData.data.variables) issues.push('❌ Data missing variables');
    
    // Validate CSS
    const cssData = JSON.parse(fs.readFileSync(filePaths.css, 'utf8'));
    if (!cssData.css) issues.push('❌ CSS file missing css property');
    if (cssData.css.length < 100) issues.push('⚠️  CSS seems too short');
    
    // Validate data structure
    const dataFileData = JSON.parse(fs.readFileSync(filePaths.data, 'utf8'));
    if (!dataFileData.variables) issues.push('❌ Data file missing variables');
    if (!dataFileData.schema) issues.push('❌ Data file missing schema');
    if (!dataFileData.defaultValues) issues.push('❌ Data file missing defaultValues');
    
    if (issues.length === 0) {
      console.log('✅ All files pass APITemplate.io format validation!');
      console.log(`   - Project structure: Valid`);
      console.log(`   - HTML template: ${projectData.template.html.length} characters`);
      console.log(`   - CSS styles: ${cssData.css.length} characters`);
      console.log(`   - Variables: ${Object.keys(projectData.data.variables).length}`);
      console.log(`   - Schema properties: ${Object.keys(dataFileData.schema.properties).length}`);
    } else {
      console.log('⚠️  Validation issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
  } catch (error) {
    console.log(`❌ Validation error: ${error.message}`);
  }
}

// Run the test
runLocalFileTest();