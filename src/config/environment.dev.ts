export interface ConfigInterface {
  ENVIRONMENT: 'dev' | 'stage' | 'production';
  S3_BUCKET: string;
  AWS_REGION: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  API_ENDPOINT: string;
  CONVERTER_ENDPOINT: string;
  ENABLE_AUTH: 'true' | 'false';
  COGNITO_DOMAIN: string;
}

export const CONFIG: ConfigInterface = {
  ENVIRONMENT: 'dev',
  S3_BUCKET: 'templatebuilder365-user-data',
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'mock-user-pool',
  COGNITO_CLIENT_ID: 'mock-client-id',
  API_ENDPOINT: 'http://localhost:3000',
  CONVERTER_ENDPOINT: 'http://localhost:3001',
  ENABLE_AUTH: 'false',
  COGNITO_DOMAIN: 'mock.auth.us-east-1.amazoncognito.com'
};

export type Environment = 'dev' | 'stage' | 'production';

export const isDevelopment = () => CONFIG.ENVIRONMENT === 'dev';
export const isStage = () => CONFIG.ENVIRONMENT === 'stage';
export const isProduction = () => CONFIG.ENVIRONMENT === 'production';
export const isAuthEnabled = () => CONFIG.ENABLE_AUTH === 'true';