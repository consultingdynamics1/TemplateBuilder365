#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function restoreTemplates() {
  console.log('Restoring template placeholders...');

  // Template content to restore
  const templateContent = `export const CONFIG = {
  ENVIRONMENT: '{{ENVIRONMENT}}',           // 'development' | 'stage' | 'production'
  S3_BUCKET: '{{S3_BUCKET}}',              // 'templatebuilder365-user-data'
  AWS_REGION: '{{AWS_REGION}}',            // 'us-east-1'
  COGNITO_USER_POOL_ID: '{{COGNITO_USER_POOL_ID}}',  // 'us-east-1_RIOPGg1Cq'
  COGNITO_CLIENT_ID: '{{COGNITO_CLIENT_ID}}',         // '2addji24p0obg5sqedgise13i4'
  API_ENDPOINT: '{{API_ENDPOINT}}',        // Lambda API URLs
  ENABLE_AUTH: '{{ENABLE_AUTH}}',          // 'false' for dev, 'true' for stage/prod
  COGNITO_DOMAIN: '{{COGNITO_DOMAIN}}'     // Cognito hosted UI domain
} as const;

export type Environment = 'development' | 'stage' | 'production';

export const isDevelopment = () => CONFIG.ENVIRONMENT === 'development';
export const isStage = () => CONFIG.ENVIRONMENT === 'stage';
export const isProduction = () => CONFIG.ENVIRONMENT === 'production';
export const isAuthEnabled = () => CONFIG.ENABLE_AUTH === 'true';`;

  const filePath = path.join(process.cwd(), 'src/config/environment.ts');

  fs.writeFileSync(filePath, templateContent, 'utf8');
  console.log('✅ Restored src/config/environment.ts to template state');
  console.log('📝 Template placeholders are ready for next deployment');
}

// Run the script
restoreTemplates();