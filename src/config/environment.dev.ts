export const CONFIG = {
  ENVIRONMENT: 'dev',
  S3_BUCKET: 'templatebuilder365-user-data',
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'mock-user-pool',
  COGNITO_CLIENT_ID: 'mock-client-id',
  API_ENDPOINT: 'https://jczxdnaz4m.execute-api.us-east-1.amazonaws.com/stage',
  ENABLE_AUTH: 'false',
  COGNITO_DOMAIN: 'mock.auth.us-east-1.amazoncognito.com'
} as const;

export type Environment = 'dev' | 'stage' | 'production';

export const isDevelopment = () => CONFIG.ENVIRONMENT === 'dev';
export const isStage = () => CONFIG.ENVIRONMENT === 'stage';
export const isProduction = () => CONFIG.ENVIRONMENT === 'production';
export const isAuthEnabled = () => CONFIG.ENABLE_AUTH === 'true';