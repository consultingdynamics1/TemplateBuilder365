/**
 * Test Image Library API with Authenticated User (OAuth PKCE Flow)
 * Tests all image library endpoints with JWT authentication
 */

import fetch from 'node-fetch';
import { createHash, randomBytes } from 'crypto';

const config = {
  userPoolId: 'us-east-1_RIOPGg1Cq',
  clientId: '2addji24p0obg5sqedgise13i4',
  domain: 'us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com',
  region: 'us-east-1',
  testUser: {
    email: 'brunipeter94@gmail.com',
    password: 'Test123!'
  },
  // Image API endpoint
  apiBaseUrl: 'https://7lr787c2s3.execute-api.us-east-1.amazonaws.com'
};

// Generate PKCE challenge (Node.js version)
function generatePKCEChallenge() {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

class ImageLibraryTester {
  constructor() {
    this.accessToken = null;
    this.userId = null;
  }

  async authenticateWithManualOAuth() {
    console.log('🔑 Setting up OAuth PKCE authentication...');
    console.log('⚠️  This requires manual browser interaction');

    const { codeVerifier, codeChallenge } = generatePKCEChallenge();

    // Build OAuth URL
    const state = Buffer.from(JSON.stringify({ test: true, timestamp: Date.now() })).toString('base64');
    const redirectUri = 'http://localhost:3000/auth-callback'; // Temporary for testing

    const authUrl = `https://${config.domain}/oauth2/authorize?` +
      `client_id=${config.clientId}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('email openid profile')}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256&` +
      `state=${state}`;

    console.log('\n📋 Manual OAuth Steps:');
    console.log('1. Open this URL in your browser:');
    console.log(`   ${authUrl}`);
    console.log(`2. Login with: ${config.testUser.email} / ${config.testUser.password}`);
    console.log('3. After redirect, copy the "code" parameter from the URL');
    console.log('4. Paste it below when prompted');
    console.log('\n⏳ Waiting for authorization code...');

    // In a real test, you'd implement a proper callback server
    // For now, we'll simulate having the code
    const authCode = await this.promptForAuthCode();

    if (!authCode) {
      console.log('❌ No authorization code provided');
      return false;
    }

    return await this.exchangeCodeForTokens(authCode, codeVerifier, redirectUri);
  }

  async promptForAuthCode() {
    // In a real implementation, you'd set up a callback server or use readline
    // For testing purposes, we'll return null and provide instructions
    console.log('\n⚠️  Manual step required: Please obtain authorization code from OAuth flow');
    console.log('   This would typically be automated with a callback server');
    return null; // Placeholder - would need manual input or callback server
  }

  async exchangeCodeForTokens(authCode, codeVerifier, redirectUri) {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');

      const response = await fetch(`https://${config.domain}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          code: authCode,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Token exchange failed: HTTP ${response.status}: ${errorText}`);
        return false;
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;
      this.userId = this.extractUserIdFromToken(tokens.id_token);

      console.log('✅ Authentication successful!');
      console.log(`👤 User ID: ${this.userId}`);
      return true;

    } catch (error) {
      console.error('❌ Token exchange error:', error.message);
      return false;
    }
  }

  extractUserIdFromToken(idToken) {
    if (!idToken) return null;

    try {
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      return payload.sub;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      return null;
    }
  }

  // Set token manually for testing (after obtaining through other means)
  setAuthToken(token, userId) {
    this.accessToken = token;
    this.userId = userId;
    console.log('✅ Authentication token set manually');
    console.log(`👤 User ID: ${this.userId}`);
  }

  async makeApiRequest(endpoint, method = 'GET', body = null) {
    if (!this.accessToken) {
      console.error('❌ No access token available. Please authenticate first.');
      return { success: false, error: 'No access token' };
    }

    const url = `${config.apiBaseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      console.log(`\n📡 ${method} ${endpoint}`);
      const response = await fetch(url, options);

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }

      if (response.ok) {
        console.log(`✅ Success (${response.status}):`, data);
      } else {
        console.log(`❌ Error (${response.status}):`, data);
      }

      return { success: response.ok, data, status: response.status };
    } catch (error) {
      console.error(`❌ Network error for ${method} ${endpoint}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async testImageUpload() {
    console.log('\n📤 Testing image upload...');

    const uploadRequest = {
      filename: 'test-logo.png',
      contentType: 'image/png',
      tags: {
        predefined: ['logo', 'branding'],
        custom: ['test-image', 'api-test']
      }
    };

    return await this.makeApiRequest('/api/images/upload', 'POST', uploadRequest);
  }

  async testImageList() {
    console.log('\n📋 Testing image list...');
    return await this.makeApiRequest('/api/images');
  }

  async testImageSearch() {
    console.log('\n🔍 Testing image search...');
    return await this.makeApiRequest('/api/images/search?tags=logo&limit=10');
  }

  async testImageGet(imageId) {
    console.log(`\n👁️ Testing get image: ${imageId}...`);
    return await this.makeApiRequest(`/api/images/${imageId}`);
  }

  async testImageUpdate(imageId) {
    console.log(`\n✏️ Testing update image: ${imageId}...`);

    const updateRequest = {
      filename: 'updated-logo.png',
      tags: {
        predefined: ['logo', 'branding', 'updated'],
        custom: ['test-updated', 'api-test-modified']
      }
    };

    return await this.makeApiRequest(`/api/images/${imageId}`, 'PUT', updateRequest);
  }

  async testImageDelete(imageId) {
    console.log(`\n🗑️ Testing delete image: ${imageId}...`);
    return await this.makeApiRequest(`/api/images/${imageId}`, 'DELETE');
  }

  async runAllTests() {
    console.log('🧪 Starting Image Library API Tests');
    console.log('=====================================');
    console.log(`📍 API Base URL: ${config.apiBaseUrl}`);
    console.log(`👤 Test User: ${config.testUser.email}`);
    console.log(`🔐 Auth Domain: ${config.domain}`);
    console.log('=====================================\n');

    // Check if API URL is configured
    if (config.apiBaseUrl.includes('your-api-id')) {
      console.log('⚠️  Please update the apiBaseUrl in the config with your deployed API endpoint');
      console.log('   You can get this from: serverless info --stage stage');
      return;
    }

    // Step 1: Authenticate (manual OAuth flow)
    const authSuccess = await this.authenticateWithManualOAuth();
    if (!authSuccess) {
      console.log('\n💡 Alternative: If you have a valid access token, you can set it manually:');
      console.log('   tester.setAuthToken(yourAccessToken, yourUserId);');
      console.log('   Then call tester.runApiTests();');
      return;
    }

    await this.runApiTests();
  }

  async runApiTests() {
    console.log('\n🔬 Running API endpoint tests...');

    // Step 2: Test image upload
    const uploadResult = await this.testImageUpload();
    let testImageId = null;

    if (uploadResult.success && uploadResult.data.imageId) {
      testImageId = uploadResult.data.imageId;
      console.log(`📌 Test image ID: ${testImageId}`);
    }

    // Step 3: Test image listing
    await this.testImageList();

    // Step 4: Test image search
    await this.testImageSearch();

    // Step 5: Test individual image operations (if we have an image ID)
    if (testImageId) {
      await this.testImageGet(testImageId);
      await this.testImageUpdate(testImageId);
      await this.testImageGet(testImageId); // Verify update

      // Optionally delete the test image
      const shouldDelete = true; // Set to false to keep test data
      if (shouldDelete) {
        await this.testImageDelete(testImageId);
      }
    }

    console.log('\n🏁 All API tests completed!');
  }
}

// Export for use as module or run directly
export { ImageLibraryTester, config };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ImageLibraryTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}