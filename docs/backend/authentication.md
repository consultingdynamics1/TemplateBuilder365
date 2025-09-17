# Authentication System

## AWS Cognito JWT Authentication

**Implementation Status**: ✅ **PRODUCTION READY**

TemplateBuilder365 includes enterprise-grade JWT authentication using AWS Cognito User Pools, replacing the previous API key system with secure, scalable user authentication.

## Authentication Flow

### 1. Protected Routes
React app shows login screen for unauthenticated users. Main design interface only accessible after authentication.

### 2. PKCE Authentication
Secure OAuth 2.0 with Proof Key for Code Exchange prevents authorization code attacks.

### 3. Cognito Hosted UI
Users authenticate via Cognito login page with professional branding.

### 4. Token Exchange
Authorization code exchanged for real JWT tokens with user information.

### 5. Session Management
Persistent authentication across browser sessions with secure token storage.

### 6. API Authorization
All API requests include JWT Bearer token for server validation.

### 7. Server Validation
AWS API Gateway validates JWT before reaching Lambda functions.

## Configuration

### Cognito User Pool
- **User Pool ID**: `us-east-1_RIOPGg1Cq` (production user pool)
- **App Client**: `TemplateStudio365-Staging` (`2addji24p0obg5sqedgise13i4`)
- **JWT Issuer**: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RIOPGg1Cq`
- **Domain**: `us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com`

### OAuth 2.0 Settings
- **Authentication Flow**: Authorization Code Grant with PKCE
- **Scopes**: `email openid profile` (profile scope required for compatibility)
- **Callback URLs**: Configured for localhost development and production domains
- **HTTPS Requirement**: Crypto.subtle API requires HTTPS context

## Frontend Integration

### Auth Context (`src/auth/AuthContext.tsx`)
```typescript
// Environment-aware authentication
function useAuthBasedOnEnvironment() {
  if (CONFIG.ENABLE_AUTH === 'false') {
    // Development mode: Mock authentication
    return {
      isAuthenticated: true,
      user: { id: 'dev-user', email: 'dev@templatebuilder365.com' },
      login: () => Promise.resolve(),
      logout: () => Promise.resolve()
    };
  } else {
    // Stage/Production: Real Cognito authentication
    return useRealCognitoAuth();
  }
}
```

### Components

#### LoginScreen (`src/auth/LoginScreen.tsx`)
- Professional branded login interface
- Features showcase for new users
- OAuth redirect handling
- Error handling and user feedback

#### Protected App (`src/App.tsx`)
- Authentication wrapper for main application
- Conditional rendering based on auth state
- Graceful fallback to demo mode if token exchange fails

#### User Interface (`src/components/Toolbar/Toolbar.tsx`)
- User email/name display in toolbar
- Logout button functionality
- Real user data from JWT ID tokens

## Security Features

### PKCE Security
- **Proof Key for Code Exchange**: Prevents authorization code interception attacks
- **Code Challenge**: Cryptographically secure challenge/verifier pair
- **State Parameter**: CSRF protection for OAuth flow

### JWT Token Validation
- **API Gateway Level**: JWT verification before Lambda execution
- **Token Structure**: Standard JWT with user claims
- **Expiration Handling**: Automatic token refresh (when implemented)

### User Context
- **Lambda Integration**: Functions receive authenticated user information
- **User Isolation**: Each user accesses only their own data
- **S3 Permissions**: User-specific IAM policies for file access

### Secure Storage
- **localStorage**: JWT tokens stored in browser localStorage
- **Session Persistence**: Maintains authentication across browser sessions
- **Automatic Cleanup**: Tokens cleared on logout

## Environment Configuration

### Development Mode
```typescript
// Development: Bypass authentication
ENABLE_AUTH: 'false'
COGNITO_USER_POOL_ID: 'mock'
COGNITO_CLIENT_ID: 'mock'
```

### Stage/Production Mode
```typescript
// Stage/Production: Real Cognito
ENABLE_AUTH: 'true'
COGNITO_USER_POOL_ID: 'us-east-1_RIOPGg1Cq'
COGNITO_CLIENT_ID: '2addji24p0obg5sqedgise13i4'
COGNITO_DOMAIN: 'us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com'
```

## Serverless Configuration

### API Gateway Authorizer (`serverless.yml`)
```yaml
httpApi:
  authorizers:
    cognitoAuthorizer:
      type: jwt
      identitySource: $request.header.Authorization
      issuerUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RIOPGg1Cq
      audience:
        - 2addji24p0obg5sqedgise13i4

functions:
  tb365Converter:
    events:
      - httpApi:
          path: /convert
          method: post
          authorizer: cognitoAuthorizer
```

### Environment Variables
```yaml
environment:
  COGNITO_USER_POOL_ID: us-east-1_RIOPGg1Cq
  COGNITO_CLIENT_ID: 2addji24p0obg5sqedgise13i4
```

## Implementation Status

### ✅ Completed Features
- React authentication system implemented and tested
- PKCE OAuth flow working end-to-end
- Real JWT token exchange and user data extraction
- Professional login/logout user interface
- Serverless configuration with working client ID
- Protected routes and session management
- Complete authentication system committed to GitHub

### ⏳ Future Enhancements
- **Token Refresh**: Automatic refresh of expired JWT tokens
- **Multi-Factor Authentication**: Optional MFA for enhanced security
- **Social Login**: Google, Microsoft, Facebook OAuth providers
- **User Profile Management**: Update user information and preferences
- **Password Reset**: Self-service password reset functionality

## HTTPS Requirements

### Security Context
- **crypto.subtle API**: Required for PKCE authentication
- **HTTPS Only**: crypto.subtle unavailable in HTTP contexts
- **CloudFront Distribution**: Provides HTTPS for S3 static websites

### Current URLs
- **Stage**: `https://de1ztc46ci2dy.cloudfront.net/` (CloudFront HTTPS)
- **S3 Origin**: `http://tb365-frontend-stage.s3-website-us-east-1.amazonaws.com` (HTTP backend)

### Cognito Callback URLs
Updated app client with CloudFront URLs for stage and production environments.

## User Experience

### Development Workflow
1. **Immediate Access**: No authentication barriers during development
2. **Mock User Context**: `dev@templatebuilder365.com` for testing
3. **Local File Storage**: Enhanced "Save As" dialog for folder selection

### Production Workflow
1. **Professional Login**: Branded Cognito hosted UI
2. **Secure Authentication**: PKCE OAuth with JWT tokens
3. **Cloud Storage**: User-specific S3 folders for projects
4. **Session Persistence**: Maintains login across browser sessions

## Troubleshooting

### Common Issues

#### crypto.subtle undefined
- **Cause**: HTTP context or localhost without HTTPS
- **Solution**: Ensure HTTPS deployment or use localhost for development

#### OAuth Redirect Mismatch
- **Cause**: Callback URL not registered in Cognito
- **Solution**: Update app client callback URLs in Cognito console

#### JWT Validation Errors
- **Cause**: Token expired or malformed
- **Solution**: Implement token refresh or redirect to login

#### CORS Errors
- **Cause**: Missing CORS configuration for authenticated requests
- **Solution**: Update API Gateway CORS settings for Authorization header

### Recovery Procedures

#### Lost Authentication State
1. Check localStorage for stored tokens
2. Verify token expiration and format
3. Clear localStorage and re-authenticate
4. Check browser developer console for errors

#### Cognito Configuration Issues
1. Verify user pool ID and client ID in environment config
2. Check callback URLs in Cognito app client settings
3. Ensure scopes include "email openid profile"
4. Verify domain configuration matches deployment URL