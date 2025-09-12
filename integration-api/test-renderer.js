#!/usr/bin/env node

/**
 * Test Script for Local Puppeteer Renderer
 * Tests PDF and PNG generation with real estate HTML template
 */

const { localRenderer } = require('./services/renderer');
const fs = require('fs').promises;
const path = require('path');

async function testRenderer() {
  console.log('🖨️  Testing Local Puppeteer Renderer');
  console.log('====================================\n');

  try {
    // Step 1: Health check
    console.log('1️⃣ Running health check...');
    const healthCheck = await localRenderer.healthCheck();
    
    if (healthCheck.healthy) {
      console.log(`   ✅ Renderer healthy (${healthCheck.responseTime})`);
      console.log(`   🌐 Browser: ${healthCheck.browserMetrics.version}`);
    } else {
      console.log('   ❌ Health check failed:', healthCheck.error);
      return;
    }

    // Step 2: Load sample HTML from our end-to-end test output
    console.log('\n2️⃣ Loading real estate HTML template...');
    
    let htmlContent;
    try {
      // Try to load from end-to-end test output
      const testOutputDir = path.join(__dirname, 'test-end-to-end-output');
      const finalResultPath = path.join(testOutputDir, 'final-result.html');
      
      if (await fileExists(finalResultPath)) {
        htmlContent = await fs.readFile(finalResultPath, 'utf8');
        console.log(`   ✅ Loaded HTML from test output (${Math.round(htmlContent.length / 1024)}KB)`);
      } else {
        throw new Error('Test output not found');
      }
    } catch (loadError) {
      console.log('   ⚠️  Test output not found, using sample HTML...');
      
      // Fallback: Create sample real estate HTML
      htmlContent = createSampleRealEstateHTML();
      console.log(`   ✅ Created sample HTML (${Math.round(htmlContent.length / 1024)}KB)`);
    }

    // Step 3: Create output directory
    console.log('\n3️⃣ Setting up output directory...');
    const outputDir = path.join(__dirname, 'test-render-output');
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`   ✅ Output directory: ${outputDir}`);

    // Step 4: Generate PDF
    console.log('\n4️⃣ Generating PDF...');
    const pdfResult = await localRenderer.generatePDF(htmlContent, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      waitTime: 2000 // Wait 2 seconds for fonts
    });

    if (pdfResult.success) {
      const pdfPath = path.join(outputDir, 'real-estate-template.pdf');
      const saveResult = await localRenderer.saveToFile(pdfResult.buffer, pdfPath);
      
      if (saveResult.success) {
        console.log(`   ✅ PDF saved: ${saveResult.sizeKB}KB`);
        console.log(`   📄 File: ${pdfPath}`);
      } else {
        console.log('   ❌ Failed to save PDF:', saveResult.error);
      }
    } else {
      console.log('   ❌ PDF generation failed:', pdfResult.error);
    }

    // Step 5: Generate PNG (full page)
    console.log('\n5️⃣ Generating PNG (full page)...');
    const pngResult = await localRenderer.generatePNG(htmlContent, {
      fullPage: true,
      width: 1200,
      height: 800,
      deviceScaleFactor: 2,
      waitTime: 2000
    });

    if (pngResult.success) {
      const pngPath = path.join(outputDir, 'real-estate-template-fullpage.png');
      const saveResult = await localRenderer.saveToFile(pngResult.buffer, pngPath);
      
      if (saveResult.success) {
        console.log(`   ✅ Full page PNG saved: ${saveResult.sizeKB}KB`);
        console.log(`   🖼️  File: ${pngPath}`);
        console.log(`   📐 Dimensions: ${pngResult.metadata.dimensions}`);
      } else {
        console.log('   ❌ Failed to save PNG:', saveResult.error);
      }
    } else {
      console.log('   ❌ PNG generation failed:', pngResult.error);
    }

    // Step 6: Generate PNG (viewport size)
    console.log('\n6️⃣ Generating PNG (viewport size)...');
    const viewportPngResult = await localRenderer.generatePNG(htmlContent, {
      fullPage: false,
      width: 800,
      height: 600,
      deviceScaleFactor: 2,
      waitTime: 2000
    });

    if (viewportPngResult.success) {
      const pngPath = path.join(outputDir, 'real-estate-template-viewport.png');
      const saveResult = await localRenderer.saveToFile(viewportPngResult.buffer, pngPath);
      
      if (saveResult.success) {
        console.log(`   ✅ Viewport PNG saved: ${saveResult.sizeKB}KB`);
        console.log(`   🖼️  File: ${pngPath}`);
        console.log(`   📐 Dimensions: ${viewportPngResult.metadata.dimensions}`);
      } else {
        console.log('   ❌ Failed to save PNG:', saveResult.error);
      }
    } else {
      console.log('   ❌ PNG generation failed:', viewportPngResult.error);
    }

    // Step 7: Generate both formats simultaneously
    console.log('\n7️⃣ Generating both formats simultaneously...');
    const startTime = Date.now();
    
    const combinedResult = await localRenderer.generateBoth(htmlContent, {
      pdf: {
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
      },
      png: {
        fullPage: false,
        width: 1000,
        height: 700,
        deviceScaleFactor: 1
      }
    });

    const combinedTime = Date.now() - startTime;

    if (combinedResult.success) {
      // Save PDF
      const pdfPath = path.join(outputDir, 'real-estate-combined.pdf');
      const pdfSave = await localRenderer.saveToFile(combinedResult.pdf.buffer, pdfPath);
      
      // Save PNG
      const pngPath = path.join(outputDir, 'real-estate-combined.png');
      const pngSave = await localRenderer.saveToFile(combinedResult.png.buffer, pngPath);
      
      console.log(`   ✅ Combined generation completed in ${combinedTime}ms`);
      console.log(`   📄 PDF: ${pdfSave.success ? pdfSave.sizeKB + 'KB' : 'Failed'}`);
      console.log(`   🖼️  PNG: ${pngSave.success ? pngSave.sizeKB + 'KB' : 'Failed'}`);
    } else {
      console.log('   ❌ Combined generation failed');
      if (combinedResult.errors?.length > 0) {
        combinedResult.errors.forEach(error => {
          console.log(`   Error: ${error.message}`);
        });
      }
    }

    // Step 8: Performance test
    console.log('\n8️⃣ Running performance test...');
    const performanceRuns = 5;
    const performanceTimes = [];
    
    for (let i = 0; i < performanceRuns; i++) {
      const perfStart = Date.now();
      const perfResult = await localRenderer.generatePNG(htmlContent, {
        width: 400,
        height: 300,
        waitTime: 500
      });
      const perfTime = Date.now() - perfStart;
      
      if (perfResult.success) {
        performanceTimes.push(perfTime);
        console.log(`   Run ${i + 1}: ${perfTime}ms`);
      }
    }

    if (performanceTimes.length > 0) {
      const avgTime = Math.round(performanceTimes.reduce((a, b) => a + b) / performanceTimes.length);
      const minTime = Math.min(...performanceTimes);
      const maxTime = Math.max(...performanceTimes);
      
      console.log(`   📊 Performance Summary:`);
      console.log(`   • Average: ${avgTime}ms`);
      console.log(`   • Min: ${minTime}ms`);
      console.log(`   • Max: ${maxTime}ms`);
    }

    // Step 9: Browser metrics
    console.log('\n9️⃣ Browser metrics...');
    const metrics = await localRenderer.getMetrics();
    
    if (metrics.available) {
      console.log(`   🌐 Version: ${metrics.version}`);
      console.log(`   🔗 Connected: ${metrics.isConnected}`);
      console.log(`   📄 Pages Open: ${metrics.pagesOpen}`);
      console.log(`   🆔 Process ID: ${metrics.processId}`);
    } else {
      console.log('   ❌ Browser metrics not available');
    }

    console.log('\n🎉 Renderer Test Complete!');
    console.log('\n📁 Generated Files:');
    console.log('• real-estate-template.pdf - Standard PDF output');
    console.log('• real-estate-template-fullpage.png - Full page screenshot');
    console.log('• real-estate-template-viewport.png - Viewport-sized screenshot');
    console.log('• real-estate-combined.pdf - Combined generation test PDF');
    console.log('• real-estate-combined.png - Combined generation test PNG');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await localRenderer.cleanup();
  }
}

/**
 * Create sample real estate HTML for testing
 * @returns {string} Sample HTML content
 */
function createSampleRealEstateHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mountain View Realty - Property Listing</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Georgia', serif;
            background-color: #f8f9fa;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #2c5aa0 0%, #1e3f73 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(44, 90, 160, 0.3);
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: bold;
        }
        
        .header p {
            margin: 10px 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .property-info, .agent-info {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .property-info h2, .agent-info h2 {
            color: #2c5aa0;
            border-bottom: 3px solid #2c5aa0;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .property-details {
            list-style: none;
            padding: 0;
        }
        
        .property-details li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            font-size: 1.1em;
        }
        
        .property-details li:last-child {
            border-bottom: none;
        }
        
        .property-details strong {
            color: #2c5aa0;
            font-weight: bold;
        }
        
        .contact-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
        }
        
        .price {
            font-size: 2em;
            color: #28a745;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: #2c5aa0;
            color: white;
            border-radius: 10px;
        }
        
        @media print {
            body { background-color: white; }
            .header, .footer { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mountain View Realty</h1>
        <p>Your Gateway to Colorado Living</p>
    </div>
    
    <div class="content">
        <div class="property-info">
            <h2>Property Details</h2>
            <ul class="property-details">
                <li><strong>Address:</strong> 2847 Pine Ridge Trail</li>
                <li><strong>Location:</strong> Boulder, Colorado 80302</li>
                <li><strong>Type:</strong> Single Family Home</li>
                <li><strong>Bedrooms:</strong> 4</li>
                <li><strong>Bathrooms:</strong> 3.5</li>
                <li><strong>Square Footage:</strong> 3,200 sq ft</li>
                <li><strong>Lot Size:</strong> 0.75 acres</li>
                <li><strong>Year Built:</strong> 2018</li>
            </ul>
            
            <div class="price">$895,000</div>
            
            <p style="font-style: italic; color: #666; margin-top: 20px;">
                Stunning modern home with panoramic mountain views. Features include gourmet kitchen, 
                master suite with walk-in closet, finished basement, and three-car garage. 
                Premium location in highly rated school district.
            </p>
        </div>
        
        <div class="agent-info">
            <h2>Contact Information</h2>
            
            <div class="contact-info">
                <p><strong>Agent:</strong> Michael Rodriguez</p>
                <p><strong>Title:</strong> Senior Real Estate Specialist</p>
                <p><strong>Phone:</strong> (720) 555-1234</p>
                <p><strong>Email:</strong> michael@mountainviewrealty.com</p>
                <p><strong>Website:</strong> https://mountainviewrealty.com</p>
                <p><strong>License:</strong> CO-RE-2024-001</p>
            </div>
            
            <h3 style="color: #2c5aa0; margin-top: 25px;">Why Choose Us?</h3>
            <ul style="color: #555;">
                <li>20+ years of local market experience</li>
                <li>Top 1% of agents in Boulder County</li>
                <li>Full-service real estate team</li>
                <li>Comprehensive marketing strategy</li>
                <li>Professional photography & virtual tours</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>Mountain View Realty | Licensed Real Estate Brokerage</p>
        <p>Serving Boulder, Denver & Surrounding Communities Since 2004</p>
    </div>
</body>
</html>`;
}

/**
 * Check if file exists
 * @param {string} filepath - Path to check
 * @returns {boolean} True if file exists
 */
async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

// Run the test
if (require.main === module) {
  testRenderer().catch(console.error);
}

module.exports = { testRenderer };