#!/usr/bin/env node

/**
 * Simple Renderer Test - Stage 1 Local Development
 * Tests basic PDF and PNG generation with simple HTML
 */

const { localRenderer } = require('./services/renderer');
const fs = require('fs').promises;
const path = require('path');

async function simpleRendererTest() {
  console.log('🖨️  Simple Puppeteer Renderer Test');
  console.log('=================================\n');

  try {
    // Step 1: Initialize renderer
    console.log('1️⃣ Initializing renderer...');
    await localRenderer.initialize();
    console.log('   ✅ Browser launched successfully');

    // Step 2: Simple HTML content
    const simpleHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Real Estate Flyer</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f5f5f5; 
        }
        .header { 
            background: #2c5aa0; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px;
        }
        .content { 
            background: white; 
            padding: 20px; 
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .price { 
            font-size: 24px; 
            color: #28a745; 
            font-weight: bold; 
            text-align: center;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mountain View Realty</h1>
        <p>Premium Real Estate Services</p>
    </div>
    
    <div class="content">
        <h2>Beautiful Family Home</h2>
        <p><strong>Address:</strong> 2847 Pine Ridge Trail, Boulder, CO 80302</p>
        <p><strong>Bedrooms:</strong> 4 | <strong>Bathrooms:</strong> 3.5 | <strong>Size:</strong> 3,200 sq ft</p>
        
        <div class="price">$895,000</div>
        
        <h3>Contact Information</h3>
        <p><strong>Agent:</strong> Michael Rodriguez</p>
        <p><strong>Phone:</strong> (720) 555-1234</p>
        <p><strong>Email:</strong> michael@mountainviewrealty.com</p>
    </div>
</body>
</html>`;

    // Step 3: Create output directory
    const outputDir = path.join(__dirname, 'test-render-simple');
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`   📁 Output: ${outputDir}`);

    // Step 4: Test PNG generation
    console.log('\n2️⃣ Testing PNG generation...');
    const pngResult = await localRenderer.generatePNG(simpleHtml, {
      width: 800,
      height: 600,
      fullPage: false,
      waitTime: 500
    });

    if (pngResult.success) {
      const pngPath = path.join(outputDir, 'real-estate-simple.png');
      await localRenderer.saveToFile(pngResult.buffer, pngPath);
      console.log(`   ✅ PNG saved: ${pngResult.metadata.sizeKB}KB`);
    } else {
      console.log('   ❌ PNG failed:', pngResult.error.message);
    }

    // Step 5: Test PDF generation with simpler options
    console.log('\n3️⃣ Testing PDF generation...');
    const pdfResult = await localRenderer.generatePDF(simpleHtml, {
      format: 'A4',
      printBackground: true,
      waitTime: 500,
      timeout: 10000 // 10 second timeout
    });

    if (pdfResult.success) {
      const pdfPath = path.join(outputDir, 'real-estate-simple.pdf');
      await localRenderer.saveToFile(pdfResult.buffer, pdfPath);
      console.log(`   ✅ PDF saved: ${pdfResult.metadata.sizeKB}KB`);
    } else {
      console.log('   ❌ PDF failed:', pdfResult.error.message);
    }

    // Step 6: Test with our actual HTML template
    console.log('\n4️⃣ Testing with actual HTML template...');
    
    let actualHtml;
    try {
      const testOutputPath = path.join(__dirname, 'test-end-to-end-output', 'final-result.html');
      actualHtml = await fs.readFile(testOutputPath, 'utf8');
      console.log(`   ✅ Loaded actual template (${Math.round(actualHtml.length / 1024)}KB)`);
      
      // Generate PNG from actual template
      const actualPngResult = await localRenderer.generatePNG(actualHtml, {
        width: 1000,
        height: 700,
        fullPage: true,
        waitTime: 1000
      });

      if (actualPngResult.success) {
        const actualPngPath = path.join(outputDir, 'actual-template.png');
        await localRenderer.saveToFile(actualPngResult.buffer, actualPngPath);
        console.log(`   ✅ Actual template PNG: ${actualPngResult.metadata.sizeKB}KB`);
      } else {
        console.log('   ❌ Actual template PNG failed:', actualPngResult.error.message);
      }
      
    } catch (error) {
      console.log('   ⚠️  Could not load actual template:', error.message);
    }

    // Step 7: Performance test
    console.log('\n5️⃣ Performance test...');
    const perfResults = [];
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const perfResult = await localRenderer.generatePNG(simpleHtml, {
        width: 400,
        height: 300,
        waitTime: 200
      });
      const time = Date.now() - start;
      
      if (perfResult.success) {
        perfResults.push(time);
        console.log(`   Run ${i + 1}: ${time}ms`);
      }
    }

    if (perfResults.length > 0) {
      const avg = Math.round(perfResults.reduce((a, b) => a + b) / perfResults.length);
      console.log(`   📊 Average: ${avg}ms`);
    }

    console.log('\n🎉 Simple Renderer Test Complete!');
    console.log('\n📁 Files generated in test-render-simple/:');
    console.log('• real-estate-simple.png - Basic PNG test');
    console.log('• real-estate-simple.pdf - Basic PDF test');
    console.log('• actual-template.png - Full HTML template test');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🧹 Cleaning up...');
    await localRenderer.cleanup();
  }
}

// Run test
simpleRendererTest().catch(console.error);