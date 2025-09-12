#!/usr/bin/env node

/**
 * Complete Local Pipeline Test
 * TB365 → HTML → Variable Replacement → Multi-Format Rendering
 * Saves all outputs to organized local folders for inspection
 */

const { tb365Parser } = require('./services/tb365-parser');
const { htmlGenerator } = require('./services/html-generator');
const { variableReplacer } = require('./services/variable-replacer');
const { localRenderer } = require('./services/renderer');
const fs = require('fs').promises;
const path = require('path');

async function runCompletePipelineTest() {
  console.log('🔄 Complete TB365 Pipeline Test');
  console.log('================================\n');

  const startTime = Date.now();
  let testResults = {
    stages: [],
    files: [],
    errors: []
  };

  try {
    // Step 1: Create timestamped output directory
    console.log('1️⃣ Setting up test environment...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const outputDir = path.join(__dirname, 'test-output', timestamp);
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log(`   📁 Output directory: ${outputDir}`);
    console.log(`   🕐 Test started: ${new Date().toISOString()}`);

    // Step 2: Create sample TB365 input data
    console.log('\n2️⃣ Creating sample TB365 input...');
    const sampleTB365Data = createSampleTB365Data();
    const sampleBusinessData = createSampleBusinessData();
    
    // Save input data
    const inputDataPath = path.join(outputDir, 'input-tb365.json');
    await fs.writeFile(inputDataPath, JSON.stringify(sampleTB365Data, null, 2));
    testResults.files.push({ name: 'input-tb365.json', path: inputDataPath, stage: 'input' });
    
    const businessDataPath = path.join(outputDir, 'data.json');
    await fs.writeFile(businessDataPath, JSON.stringify(sampleBusinessData, null, 2));
    testResults.files.push({ name: 'data.json', path: businessDataPath, stage: 'input' });
    
    console.log(`   ✅ TB365 data: ${sampleTB365Data.canvasState.elements.length} elements`);
    console.log(`   ✅ Business data: ${Object.keys(sampleBusinessData).length} categories`);

    // Step 3: Parse TB365 format
    console.log('\n3️⃣ Parsing TB365 format...');
    const parseStart = Date.now();
    
    const parsedData = await tb365Parser.parse(sampleTB365Data);
    const parseTime = Date.now() - parseStart;
    
    testResults.stages.push({
      stage: 'parse',
      duration: parseTime + 'ms',
      success: true,
      details: {
        elements: parsedData.elements.length,
        variables: parsedData.textContent.variables.length
      }
    });
    
    console.log(`   ✅ Parsed successfully in ${parseTime}ms`);
    console.log(`   📊 Elements: ${parsedData.elements.length}, Variables: ${parsedData.textContent.variables.length}`);

    // Step 4: Generate HTML template
    console.log('\n4️⃣ Generating HTML template...');
    const htmlStart = Date.now();
    
    const htmlResult = await htmlGenerator.generate(parsedData, {
      includeAssets: false,
      generatePreview: false
    });
    const htmlTime = Date.now() - htmlStart;
    
    testResults.stages.push({
      stage: 'html_generation',
      duration: htmlTime + 'ms',
      success: true,
      details: {
        sizeKB: Math.round(htmlResult.html.length / 1024),
        variables: htmlResult.metadata.variables,
        complexity: htmlResult.metadata.complexity
      }
    });
    
    // Save template HTML
    const templatePath = path.join(outputDir, 'template.html');
    await fs.writeFile(templatePath, htmlResult.html);
    testResults.files.push({
      name: 'template.html',
      path: templatePath,
      stage: 'html_generation',
      sizeKB: Math.round(htmlResult.html.length / 1024)
    });
    
    console.log(`   ✅ HTML generated in ${htmlTime}ms (${Math.round(htmlResult.html.length / 1024)}KB)`);
    console.log(`   📊 Variables: ${htmlResult.metadata.variables}, Complexity: ${htmlResult.metadata.complexity}`);

    // Step 5: Variable replacement
    console.log('\n5️⃣ Performing variable replacement...');
    const replaceStart = Date.now();
    
    const replacementResult = variableReplacer.replaceVariables(
      htmlResult.html,
      sampleBusinessData,
      htmlResult.data?.defaultValues || {},
      { escapeHtml: false }
    );
    const replaceTime = Date.now() - replaceStart;
    
    testResults.stages.push({
      stage: 'variable_replacement',
      duration: replaceTime + 'ms',
      success: replacementResult.success,
      details: {
        totalVariables: replacementResult.statistics?.totalVariables || 0,
        replacedVariables: replacementResult.statistics?.replacedVariables || 0,
        missingVariables: replacementResult.statistics?.missingVariables || 0,
        warnings: replacementResult.warnings?.length || 0
      }
    });
    
    if (replacementResult.success) {
      // Save final HTML
      const finalPath = path.join(outputDir, 'final.html');
      await fs.writeFile(finalPath, replacementResult.html);
      testResults.files.push({
        name: 'final.html',
        path: finalPath,
        stage: 'variable_replacement',
        sizeKB: Math.round(replacementResult.html.length / 1024)
      });
      
      console.log(`   ✅ Variables replaced in ${replaceTime}ms`);
      console.log(`   📊 ${replacementResult.statistics.replacedVariables}/${replacementResult.statistics.totalVariables} variables replaced`);
      
      if (replacementResult.warnings?.length > 0) {
        console.log(`   ⚠️  ${replacementResult.warnings.length} warnings`);
      }
    } else {
      console.log(`   ❌ Variable replacement failed: ${replacementResult.error}`);
      testResults.errors.push({
        stage: 'variable_replacement',
        error: replacementResult.error
      });
    }

    // Step 6: Initialize renderer
    console.log('\n6️⃣ Initializing renderer...');
    await localRenderer.initialize();
    console.log('   ✅ Puppeteer browser launched');

    // Step 7: Generate PNG
    console.log('\n7️⃣ Generating PNG screenshot...');
    const pngStart = Date.now();
    
    const finalHtml = replacementResult.success ? replacementResult.html : htmlResult.html;
    const pngResult = await localRenderer.generatePNG(finalHtml, {
      width: 1200,
      height: 800,
      fullPage: true,
      deviceScaleFactor: 2,
      waitTime: 2000
    });
    const pngTime = Date.now() - pngStart;
    
    testResults.stages.push({
      stage: 'png_generation',
      duration: pngTime + 'ms',
      success: pngResult.success,
      details: pngResult.success ? {
        sizeKB: pngResult.metadata.sizeKB,
        dimensions: pngResult.metadata.dimensions
      } : { error: pngResult.error.message }
    });
    
    if (pngResult.success) {
      const pngPath = path.join(outputDir, 'output.png');
      await localRenderer.saveToFile(pngResult.buffer, pngPath);
      testResults.files.push({
        name: 'output.png',
        path: pngPath,
        stage: 'png_generation',
        sizeKB: pngResult.metadata.sizeKB
      });
      
      console.log(`   ✅ PNG generated in ${pngTime}ms (${pngResult.metadata.sizeKB}KB)`);
      console.log(`   📐 Dimensions: ${pngResult.metadata.dimensions}`);
    } else {
      console.log(`   ❌ PNG generation failed: ${pngResult.error.message}`);
      testResults.errors.push({
        stage: 'png_generation',
        error: pngResult.error.message
      });
    }

    // Step 8: Generate PDF (attempt with error handling)
    console.log('\n8️⃣ Generating PDF...');
    const pdfStart = Date.now();
    
    try {
      const pdfResult = await localRenderer.generatePDF(finalHtml, {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        waitTime: 1500,
        timeout: 15000
      });
      const pdfTime = Date.now() - pdfStart;
      
      testResults.stages.push({
        stage: 'pdf_generation',
        duration: pdfTime + 'ms',
        success: pdfResult.success,
        details: pdfResult.success ? {
          sizeKB: pdfResult.metadata.sizeKB,
          format: pdfResult.metadata.format
        } : { error: pdfResult.error.message }
      });
      
      if (pdfResult.success) {
        const pdfPath = path.join(outputDir, 'output.pdf');
        await localRenderer.saveToFile(pdfResult.buffer, pdfPath);
        testResults.files.push({
          name: 'output.pdf',
          path: pdfPath,
          stage: 'pdf_generation',
          sizeKB: pdfResult.metadata.sizeKB
        });
        
        console.log(`   ✅ PDF generated in ${pdfTime}ms (${pdfResult.metadata.sizeKB}KB)`);
        console.log(`   📄 Format: ${pdfResult.metadata.format}`);
      } else {
        console.log(`   ❌ PDF generation failed: ${pdfResult.error.message}`);
        testResults.errors.push({
          stage: 'pdf_generation',
          error: pdfResult.error.message
        });
      }
    } catch (pdfError) {
      console.log(`   ❌ PDF generation error: ${pdfError.message}`);
      testResults.stages.push({
        stage: 'pdf_generation',
        duration: (Date.now() - pdfStart) + 'ms',
        success: false,
        details: { error: pdfError.message }
      });
      testResults.errors.push({
        stage: 'pdf_generation',
        error: pdfError.message
      });
    }

    // Step 9: Generate metadata
    console.log('\n9️⃣ Generating metadata...');
    const totalTime = Date.now() - startTime;
    
    const metadata = {
      testInfo: {
        timestamp: new Date().toISOString(),
        totalDuration: totalTime + 'ms',
        success: testResults.errors.length === 0,
        outputDirectory: outputDir
      },
      pipeline: {
        stages: testResults.stages,
        errors: testResults.errors
      },
      input: {
        tb365Elements: sampleTB365Data.canvasState.elements.length,
        businessDataCategories: Object.keys(sampleBusinessData).length
      },
      output: {
        filesGenerated: testResults.files.length,
        totalSizeKB: testResults.files.reduce((sum, file) => sum + (file.sizeKB || 0), 0)
      },
      files: testResults.files.map(file => ({
        name: file.name,
        stage: file.stage,
        sizeKB: file.sizeKB || 0,
        relativePath: path.relative(__dirname, file.path)
      }))
    };
    
    const metadataPath = path.join(outputDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    testResults.files.push({
      name: 'metadata.json',
      path: metadataPath,
      stage: 'metadata'
    });
    
    console.log(`   ✅ Metadata saved`);

    // Final Results Summary
    console.log(`\n🎉 Complete Pipeline Test Finished!`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📁 Output directory: ${outputDir}\n`);
    
    console.log('📋 Pipeline Results:');
    testResults.stages.forEach(stage => {
      const status = stage.success ? '✅' : '❌';
      console.log(`   ${status} ${stage.stage}: ${stage.duration}`);
    });
    
    if (testResults.errors.length > 0) {
      console.log(`\n⚠️  ${testResults.errors.length} errors occurred:`);
      testResults.errors.forEach(error => {
        console.log(`   • ${error.stage}: ${error.error}`);
      });
    }
    
    console.log('\n📁 Generated Files:');
    testResults.files.forEach(file => {
      const size = file.sizeKB ? ` (${file.sizeKB}KB)` : '';
      console.log(`   📄 ${file.name}${size} - ${file.stage}`);
    });
    
    console.log('\n🔍 Validation Steps:');
    console.log(`   1. Open ${path.join(outputDir, 'template.html')} in browser (template with variables)`);
    console.log(`   2. Open ${path.join(outputDir, 'final.html')} in browser (final with data)`);
    if (testResults.files.find(f => f.name === 'output.png')) {
      console.log(`   3. View ${path.join(outputDir, 'output.png')} (PNG screenshot)`);
    }
    if (testResults.files.find(f => f.name === 'output.pdf')) {
      console.log(`   4. Open ${path.join(outputDir, 'output.pdf')} (PDF document)`);
    }
    console.log(`   5. Check ${path.join(outputDir, 'metadata.json')} (complete test details)`);

    return {
      success: testResults.errors.length === 0,
      outputDirectory: outputDir,
      metadata,
      duration: totalTime
    };

  } catch (error) {
    console.error('💥 Pipeline test failed:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  } finally {
    // Cleanup renderer
    console.log('\n🧹 Cleaning up...');
    await localRenderer.cleanup();
  }
}

/**
 * Create sample TB365 data for testing
 */
function createSampleTB365Data() {
  return {
    projectName: 'Complete Pipeline Test - Real Estate Flyer',
    savedAt: new Date().toISOString(),
    version: '1.0',
    canvasState: {
      elements: [
        {
          id: 'header-bg',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          size: { width: 800, height: 120 },
          visible: true,
          locked: false,
          name: 'header-background',
          zIndex: 1,
          fill: '#2c5aa0',
          stroke: '#1e3f73',
          strokeWidth: 2,
          cornerRadius: 10
        },
        {
          id: 'company-title',
          type: 'text',
          position: { x: 50, y: 30 },
          size: { width: 700, height: 60 },
          visible: true,
          locked: false,
          name: 'company-title',
          zIndex: 2,
          content: '{{agency.name}}',
          fontSize: 36,
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textAlign: 'center',
          color: '#ffffff',
          backgroundColor: 'transparent',
          padding: 0
        },
        {
          id: 'tagline',
          type: 'text',
          position: { x: 50, y: 80 },
          size: { width: 700, height: 30 },
          visible: true,
          locked: false,
          name: 'tagline',
          zIndex: 3,
          content: '{{agency.tagline}}',
          fontSize: 18,
          fontFamily: 'Georgia',
          fontWeight: 'normal',
          fontStyle: 'italic',
          textAlign: 'center',
          color: '#ffffff',
          backgroundColor: 'transparent',
          padding: 0
        },
        {
          id: 'property-details',
          type: 'text',
          position: { x: 50, y: 150 },
          size: { width: 350, height: 200 },
          visible: true,
          locked: false,
          name: 'property-details',
          zIndex: 4,
          content: 'PROPERTY DETAILS\\n\\nAddress: {{property.address}}\\nCity: {{property.city}}, {{property.state}} {{property.zip}}\\nType: {{property.type}}\\nBedrooms: {{property.bedrooms}}\\nBathrooms: {{property.bathrooms}}\\nSquare Feet: {{property.sqft}}\\nLot Size: {{property.lotSize}}',
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
          id: 'price-box',
          type: 'rectangle',
          position: { x: 450, y: 150 },
          size: { width: 300, height: 80 },
          visible: true,
          locked: false,
          name: 'price-background',
          zIndex: 5,
          fill: '#28a745',
          stroke: '#1e7e34',
          strokeWidth: 2,
          cornerRadius: 8
        },
        {
          id: 'price-text',
          type: 'text',
          position: { x: 450, y: 150 },
          size: { width: 300, height: 80 },
          visible: true,
          locked: false,
          name: 'price-text',
          zIndex: 6,
          content: '{{property.price}}',
          fontSize: 32,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textAlign: 'center',
          color: '#ffffff',
          backgroundColor: 'transparent',
          padding: 10
        },
        {
          id: 'agent-info',
          type: 'text',
          position: { x: 450, y: 250 },
          size: { width: 300, height: 150 },
          visible: true,
          locked: false,
          name: 'agent-info',
          zIndex: 7,
          content: 'CONTACT INFORMATION\\n\\nAgent: {{agent.name}}\\nTitle: {{agent.title}}\\nPhone: {{agent.phone}}\\nEmail: {{agent.email}}\\nWebsite: {{agency.website}}\\nLicense: {{agency.license}}',
          fontSize: 14,
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
      canvasSize: { width: 800, height: 450 },
      zoom: 1,
      snapToGrid: false,
      gridSize: 20
    }
  };
}

/**
 * Create sample business data for variable replacement
 */
function createSampleBusinessData() {
  return {
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
      type: 'Single Family Home',
      price: '895000',
      bedrooms: '4',
      bathrooms: '3.5',
      sqft: '3200',
      lotSize: '0.75 acres'
    }
  };
}

// Run the test if called directly
if (require.main === module) {
  runCompletePipelineTest().catch(console.error);
}

module.exports = { runCompletePipelineTest };