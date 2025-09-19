// Smart environment configuration loader
// Uses Vite environment variables to select the correct config at build time

import type { CONFIG as ConfigType } from './environment.dev';

// Get the environment from Vite environment variables
const env = import.meta.env.VITE_APP_ENV || 'dev';

let envConfig: typeof import('./environment.dev');

switch (env) {
  case 'stage':
    envConfig = await import('./environment.stage');
    break;
  case 'production':
  case 'prod':
    envConfig = await import('./environment.prod');
    break;
  case 'dev':
  case 'development':
  default:
    envConfig = await import('./environment.dev');
    break;
}

// Re-export all configuration from the selected environment
export const { CONFIG, isDevelopment, isStage, isProduction, isAuthEnabled } = envConfig;
export type { Environment } from './environment.dev';