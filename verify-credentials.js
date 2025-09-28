#!/usr/bin/env node

/**
 * Alternative credential verification using AWS SDK
 * This tests if we can at least confirm the user pool setup
 */

import { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

async function verifySetup() {
    console.log('🔐 Verifying Cognito Setup');
    console.log('==========================');

    try {
        // Check if we can access the user pool client configuration
        const command = new DescribeUserPoolClientCommand({
            UserPoolId: 'us-east-1_RIOPGg1Cq',
            ClientId: '2addji24p0obg5sqedgise13i4'
        });

        const response = await client.send(command);
        console.log('✅ User Pool Client Configuration:');
        console.log(`  Client Name: ${response.UserPoolClient.ClientName}`);
        console.log(`  Auth Flows: ${response.UserPoolClient.ExplicitAuthFlows?.join(', ') || 'None'}`);
        console.log(`  Supported Identity Providers: ${response.UserPoolClient.SupportedIdentityProviders?.join(', ') || 'None'}`);
        console.log(`  Callback URLs: ${response.UserPoolClient.CallbackURLs?.join(', ') || 'None'}`);

        console.log('');
        console.log('📋 Test Recommendation:');
        console.log('1. Use the stage environment: https://de1ztc46ci2dy.cloudfront.net/');
        console.log('2. Click login and use credentials: brunipeter94@gmail.com / Test123!');
        console.log('3. If login succeeds, credentials are valid and ready for backend testing');

    } catch (error) {
        if (error.name === 'AccessDeniedException') {
            console.log('⚠️  Limited AWS permissions - cannot query user pool details');
            console.log('📋 Direct Test Method:');
            console.log('1. Open: https://de1ztc46ci2dy.cloudfront.net/');
            console.log('2. Test login with: brunipeter94@gmail.com / Test123!');
            console.log('3. If login works, credentials are valid');
        } else {
            console.log('❌ Error checking setup:', error.message);
        }
    }
}

verifySetup().catch(console.error);