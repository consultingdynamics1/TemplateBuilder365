export const CONFIG = {
  ENVIRONMENT: 'stage',
  S3_BUCKET: 'templatebuilder365-user-data',
  AWS_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_RIOPGg1Cq',
  COGNITO_CLIENT_ID: '2addji24p0obg5sqedgise13i4',
  API_ENDPOINT: 'https://3r46i2h8rl.execute-api.us-east-1.amazonaws.com',
  ENABLE_AUTH: 'true',
  COGNITO_DOMAIN: 'us-east-1riopgg1cq.auth.us-east-1.amazoncognito.com'
} as const;

export type Environment = 'dev' | 'stage' | 'production';

export const isDevelopment = () => CONFIG.ENVIRONMENT === 'dev';
export const isStage = () => CONFIG.ENVIRONMENT === 'stage';
export const isProduction = () => CONFIG.ENVIRONMENT === 'production';
export const isAuthEnabled = () => CONFIG.ENABLE_AUTH === 'true';