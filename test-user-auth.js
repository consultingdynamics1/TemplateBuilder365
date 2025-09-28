#!/usr/bin/env node

/**
 * Test script to verify brunipeter94@gmail.com authentication
 * This script tests the Cognito authentication flow without PKCE
 * to verify the user credentials work correctly.
 */

import crypto from 'crypto';
import { execSync } from 'child_process';

// Cognito configuration from docs/backend/authentication.md
const COGNITO_CONFIG = {
  userPoolId: 'us-east-1_RIOPGg1Cq',
  clientId: '2addji24p0obg5sqedgise13i4',
  region: 'us-east-1'
};

// Test credentials
const TEST_USER = {
  username: 'brunipeter94@gmail.com',
  password: 'Test123!'
};

/**
 * Test user authentication using AWS CLI
 */
async function testUserAuth() {
  console.log('🔐 Testing Cognito User Authentication');
  console.log('=====================================');
  console.log(`User Pool ID: ${COGNITO_CONFIG.userPoolId}`);
  console.log(`Client ID: ${COGNITO_CONFIG.clientId}`);
  console.log(`Username: ${TEST_USER.username}`);
  console.log('');

  try {
    // Test 1: Check if user exists in the user pool
    console.log('🔍 Step 1: Checking if user exists...');

    // execSync already imported at top

    // Use AWS CLI to initiate auth (this will test if user/password are valid)
    const authCommand = `aws cognito-idp initiate-auth \
      --auth-flow USER_PASSWORD_AUTH \
      --client-id ${COGNITO_CONFIG.clientId} \
      --auth-parameters USERNAME="${TEST_USER.username}",PASSWORD="${TEST_USER.password}" \
      --region ${COGNITO_CONFIG.region}`;

    console.log('⚡ Attempting authentication...');

    const result = execSync(authCommand, { encoding: 'utf8' });
    const authResult = JSON.parse(result);

    console.log('✅ Authentication successful!');
    console.log('📋 Authentication result:');

    if (authResult.AuthenticationResult) {
      console.log('  ✓ Access Token received');
      console.log('  ✓ ID Token received');
      console.log('  ✓ Refresh Token received');
      console.log(`  ⏰ Token expires in: ${authResult.AuthenticationResult.ExpiresIn} seconds`);

      // Decode the ID token to show user info
      const idToken = authResult.AuthenticationResult.IdToken;
      const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

      console.log('');
      console.log('👤 User Information from JWT:');
      console.log(`  Email: ${tokenPayload.email || 'Not available'}`);
      console.log(`  Email Verified: ${tokenPayload.email_verified || 'Unknown'}`);
      console.log(`  User Sub (ID): ${tokenPayload.sub}`);
      console.log(`  Token Issued At: ${new Date(tokenPayload.iat * 1000).toISOString()}`);
      console.log(`  Token Expires At: ${new Date(tokenPayload.exp * 1000).toISOString()}`);

      return {
        success: true,
        tokens: authResult.AuthenticationResult,
        userInfo: {
          email: tokenPayload.email,
          userId: tokenPayload.sub,
          emailVerified: tokenPayload.email_verified
        }
      };
    } else {
      console.log('⚠️  Unexpected response format');
      return { success: false, error: 'Unexpected response format' };
    }

  } catch (error) {
    console.log('❌ Authentication failed');
    console.log('📝 Error details:');

    if (error.stderr) {
      try {
        const errorObj = JSON.parse(error.stderr);
        console.log(`  Error Code: ${errorObj.Error?.Code || 'Unknown'}`);
        console.log(`  Error Message: ${errorObj.Error?.Message || error.stderr}`);
      } catch (parseError) {
        console.log(`  Raw Error: ${error.stderr}`);
      }
    } else {
      console.log(`  Error: ${error.message}`);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  const result = await testUserAuth();

  console.log('');
  console.log('🎯 Test Summary:');
  console.log('================');

  if (result.success) {
    console.log('✅ User credentials are VALID');
    console.log('✅ JWT tokens successfully obtained');
    console.log('✅ Ready for backend test harness');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Use these credentials in test harness');
    console.log('2. Build Lambda functions with JWT validation');
    console.log('3. Test image library API endpoints');
  } else {
    console.log('❌ User credentials are INVALID');
    console.log('📋 Possible issues:');
    console.log('1. User may not exist in the user pool');
    console.log('2. Password may be incorrect');
    console.log('3. User account may be disabled/unconfirmed');
    console.log('4. CLIENT_USER_PASSWORD_AUTH may not be enabled');
  }

  process.exit(result.success ? 0 : 1);
}

// Run the test
main().catch(console.error);