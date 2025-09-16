export const CONFIG = {
  ENVIRONMENT: 'development',           // 'development' | 'stage' | 'production'
  S3_BUCKET: 'local-filesystem',              // 'templatebuilder365-user-data'
  AWS_REGION: 'us-east-1',            // 'us-east-1'
  COGNITO_USER_POOL_ID: 'mock-user-pool',  // 'us-east-1_RIOPGg1Cq'
  COGNITO_CLIENT_ID: 'mock-client-id',         // '2addji24p0obg5sqedgise13i4'
  API_ENDPOINT: 'http://localhost:3000',        // Lambda API URLs
  ENABLE_AUTH: 'false',          // 'false' for dev, 'true' for stage/prod
  COGNITO_DOMAIN: 'mock.auth.us-east-1.amazoncognito.com'     // Cognito hosted UI domain
} as const;

export type Environment = 'development' | 'stage' | 'production';

export const isDevelopment = () => CONFIG.ENVIRONMENT === 'development';
export const isStage = () => CONFIG.ENVIRONMENT === 'stage';
export const isProduction = () => CONFIG.ENVIRONMENT === 'production';
export const isAuthEnabled = () => CONFIG.ENABLE_AUTH === 'true';