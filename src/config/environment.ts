export const CONFIG = {
  ENVIRONMENT: 'development',           // 'development' | 'stage' | 'production'
  S3_BUCKET: 'templatebuilder365-user-data',              // 'templatebuilder365-user-data'
  AWS_REGION: 'us-east-1',            // 'us-east-1'
  COGNITO_USER_POOL_ID: 'mock-user-pool',  // 'us-east-1_RIOPGg1Cq'
  COGNITO_CLIENT_ID: 'mock-client-id',         // '2addji24p0obg5sqedgise13i4'
  API_ENDPOINT: 'https://jczxdnaz4m.execute-api.us-east-1.amazonaws.com/stage',        // Lambda API URLs
  ENABLE_AUTH: 'false',          // 'false' for dev, 'true' for stage/prod
  COGNITO_DOMAIN: 'mock.auth.us-east-1.amazoncognito.com',     // Cognito hosted UI domain
  PROJECT_VERSION_RETENTION: '3'      // Number of project versions to keep
} as const;

export type Environment = 'development' | 'stage' | 'production';

export const isDevelopment = () => CONFIG.ENVIRONMENT === 'development';
export const isStage = () => CONFIG.ENVIRONMENT === 'stage';
export const isProduction = () => CONFIG.ENVIRONMENT === 'production';
export const isAuthEnabled = () => CONFIG.ENABLE_AUTH === 'true';