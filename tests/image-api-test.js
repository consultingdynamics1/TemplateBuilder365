/**
 * Image API Test Harness
 * Tests the deployed tb365-image-api-stage endpoints with real images
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const IMAGE_API_URL = 'https://7lr787c2s3.execute-api.us-east-1.amazonaws.com';
const TEST_USER_ID = 'test-user-123';
const TEST_IMAGES_DIR = path.join(__dirname, 'test-images');

// Cognito configuration
const COGNITO_CONFIG = {
  userPoolId: 'us-east-1_RIOPGg1Cq',
  clientId: '2addji24p0obg5sqedgise13i4',
  region: 'us-east-1',
  testUser: {
    email: 'brunipeter94@gmail.com',
    password: 'Test123!'
  }
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// JWT token from command line or browser localStorage
let JWT_TOKEN = process.argv[2] || null;

/**
 * Create a simple 1x1 pixel PNG test image programmatically
 * Creates a minimal valid PNG without requiring Canvas
 */
function createTestImage(name, color = 'red') {
  // Minimal 1x1 PNG file as buffer (red pixel)
  const redPixelPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // IHDR data
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00, 0x00, // Compressed red pixel
    0x00, 0x01, 0x00, 0x01, 0x5A, 0x48, 0x2D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
    0xAE, 0x42, 0x60, 0x82
  ]);

  return redPixelPNG;
}

/**
 * Ensure test images directory exists and create test images
 */
function setupTestImages() {
  console.log('🖼️  Setting up test images...');

  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
  }

  // Create minimal test images
  const testImages = [
    { name: 'small-test.png', color: 'red' },
    { name: 'medium-test.png', color: 'green' },
    { name: 'large-test.png', color: 'blue' }
  ];

  testImages.forEach(img => {
    const imagePath = path.join(TEST_IMAGES_DIR, img.name);
    if (!fs.existsSync(imagePath)) {
      const buffer = createTestImage(img.name, img.color);
      fs.writeFileSync(imagePath, buffer);
      console.log(`✅ Created ${img.name} (1x1 PNG)`);
    }
  });
}

/**
 * Get JWT token from localStorage (same pattern as existing code)
 */
function getStoredToken() {
  // In Node.js, we can't access localStorage directly
  // We'll need to get the token from the user or use a different approach
  return JWT_TOKEN;
}

/**
 * Make authenticated request to image API (same pattern as imageService.ts)
 */
async function makeAuthenticatedRequest(endpoint, options = {}) {
  const url = `${IMAGE_API_URL}${endpoint}`;
  const token = getStoredToken();

  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}

/**
 * Test health endpoint (no auth required)
 */
async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...');

  try {
    const response = await fetch(`${IMAGE_API_URL}/health`);
    const data = await response.text();

    if (response.ok) {
      console.log('✅ Health check passed:', data);
      testResults.passed++;
    } else {
      console.log('❌ Health check failed:', response.status, data);
      testResults.failed++;
      testResults.errors.push(`Health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Health check error: ${error.message}`);
  }
}

/**
 * Test image upload
 */
async function testImageUpload(imagePath) {
  const fileName = path.basename(imagePath);
  console.log(`\n📤 Testing image upload: ${fileName}...`);

  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  Test image not found: ${imagePath}`);
      return null;
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('tags', JSON.stringify(['test', 'automation', fileName.split('.')[0]]));
    formData.append('userId', TEST_USER_ID);

    const response = await makeAuthenticatedRequest('/api/images', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Image upload successful:', {
        imageId: result.imageId,
        filename: result.filename,
        size: result.size
      });
      testResults.passed++;
      return result.imageId;
    } else {
      console.log('❌ Image upload failed:', result.error || 'Unknown error');
      testResults.failed++;
      testResults.errors.push(`Upload failed for ${fileName}: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Image upload error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Upload error for ${fileName}: ${error.message}`);
    return null;
  }
}

/**
 * Test listing user images
 */
async function testListImages() {
  console.log('\n📋 Testing image list...');

  try {
    const response = await makeAuthenticatedRequest(`/api/images?userId=${TEST_USER_ID}`);
    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Image list successful:', {
        totalImages: result.images.length,
        images: result.images.map(img => ({ id: img.imageId, filename: img.filename, tags: img.tags }))
      });
      testResults.passed++;
      return result.images;
    } else {
      console.log('❌ Image list failed:', result.error || 'Unknown error');
      testResults.failed++;
      testResults.errors.push(`List images failed: ${result.error}`);
      return [];
    }
  } catch (error) {
    console.log('❌ Image list error:', error.message);
    testResults.failed++;
    testResults.errors.push(`List images error: ${error.message}`);
    return [];
  }
}

/**
 * Test image retrieval
 */
async function testImageRetrieval(imageId) {
  console.log(`\n🔍 Testing image retrieval: ${imageId}...`);

  try {
    const response = await makeAuthenticatedRequest(`/api/images/${imageId}`);
    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Image retrieval successful:', {
        imageId: result.image.imageId,
        filename: result.image.filename,
        url: result.image.url ? 'URL provided' : 'No URL',
        tags: result.image.tags
      });
      testResults.passed++;
      return result.image;
    } else {
      console.log('❌ Image retrieval failed:', result.error || 'Unknown error');
      testResults.failed++;
      testResults.errors.push(`Retrieval failed for ${imageId}: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Image retrieval error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Retrieval error for ${imageId}: ${error.message}`);
    return null;
  }
}

/**
 * Test image search by tags
 */
async function testImageSearch(tags) {
  console.log(`\n🔎 Testing image search: ${tags.join(', ')}...`);

  try {
    const tagQuery = tags.map(tag => `tags=${encodeURIComponent(tag)}`).join('&');
    const response = await makeAuthenticatedRequest(`/api/images/search?userId=${TEST_USER_ID}&${tagQuery}`);
    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Image search successful:', {
        foundImages: result.images.length,
        searchTags: tags,
        results: result.images.map(img => ({ id: img.imageId, filename: img.filename, matchingTags: img.tags }))
      });
      testResults.passed++;
      return result.images;
    } else {
      console.log('❌ Image search failed:', result.error || 'Unknown error');
      testResults.failed++;
      testResults.errors.push(`Search failed for tags ${tags.join(',')}: ${result.error}`);
      return [];
    }
  } catch (error) {
    console.log('❌ Image search error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Search error for tags ${tags.join(',')}: ${error.message}`);
    return [];
  }
}

/**
 * Test image deletion
 */
async function testImageDeletion(imageId) {
  console.log(`\n🗑️  Testing image deletion: ${imageId}...`);

  try {
    const response = await makeAuthenticatedRequest(`/api/images/${imageId}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Image deletion successful');
      testResults.passed++;
      return true;
    } else {
      console.log('❌ Image deletion failed:', result.error || 'Unknown error');
      testResults.failed++;
      testResults.errors.push(`Deletion failed for ${imageId}: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Image deletion error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Deletion error for ${imageId}: ${error.message}`);
    return false;
  }
}

/**
 * Print test summary
 */
function printTestSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log('\n💡 NOTE: Make sure to update MOCK_JWT_TOKEN with a real JWT token for authenticated tests');
}

/**
 * Main test execution
 */
async function runImageAPITests() {
  console.log('🚀 Starting Image API Test Harness');
  console.log(`📍 Testing endpoint: ${IMAGE_API_URL}`);
  console.log(`👤 Test user ID: ${TEST_USER_ID}`);

  if (!JWT_TOKEN) {
    console.log('\n🔑 No JWT token provided!');
    console.log('📋 To get your token:');
    console.log('   1. Open CloudFront app: https://de1ztc46ci2dy.cloudfront.net/');
    console.log('   2. Log in with your credentials');
    console.log('   3. Open browser dev tools → Application → Local Storage');
    console.log('   4. Copy the value of "tb365_token"');
    console.log('   5. Run: node tests/image-api-test.js "your-token-here"');
    console.log('\n⚠️  Running tests without authentication (only health check will work)\n');
  } else {
    console.log(`🔑 JWT token provided (${JWT_TOKEN.substring(0, 20)}...)`);
  }

  // Setup
  setupTestImages();

  // Test health endpoint
  await testHealthEndpoint();

  // Get test images
  const testImageFiles = fs.existsSync(TEST_IMAGES_DIR)
    ? fs.readdirSync(TEST_IMAGES_DIR).filter(file => file.match(/\.(png|jpg|jpeg|webp)$/i))
    : [];

  if (testImageFiles.length === 0) {
    console.log('⚠️  No test images found. Please add images to tests/test-images/ directory');
    printTestSummary();
    return;
  }

  console.log(`\n📁 Found ${testImageFiles.length} test images:`, testImageFiles);

  // Upload test images
  const uploadedImageIds = [];
  for (const fileName of testImageFiles) {
    const imagePath = path.join(TEST_IMAGES_DIR, fileName);
    const imageId = await testImageUpload(imagePath);
    if (imageId) {
      uploadedImageIds.push(imageId);
    }
  }

  if (uploadedImageIds.length === 0) {
    console.log('⚠️  No images uploaded successfully. Skipping remaining tests.');
    printTestSummary();
    return;
  }

  // Test listing images
  const listedImages = await testListImages();

  // Test retrieving specific images
  for (const imageId of uploadedImageIds.slice(0, 2)) { // Test first 2 images
    await testImageRetrieval(imageId);
  }

  // Test search functionality
  await testImageSearch(['test']);
  await testImageSearch(['automation']);

  // Test deletion (delete first uploaded image)
  if (uploadedImageIds.length > 0) {
    await testImageDeletion(uploadedImageIds[0]);
  }

  // Print final summary
  printTestSummary();
}

// Run tests if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     import.meta.url.endsWith(process.argv[1]) ||
                     process.argv[1]?.endsWith('image-api-test.js');

if (isMainModule) {
  runImageAPITests().catch(error => {
    console.error('💥 Test harness crashed:', error);
    process.exit(1);
  });
}

export { runImageAPITests };