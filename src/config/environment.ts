// Smart environment configuration loader
// Uses URL/domain to detect environment at runtime - no build-time variables needed!

import type { ConfigInterface } from './environment.dev';

// Detect environment based on current URL/domain
function detectEnvironment(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return 'dev';
  }

  const hostname = window.location.hostname;

  // Production environment (when we have a production domain)
  if (hostname === 'templatebuilder365.com' || hostname === 'www.templatebuilder365.com') {
    return 'production';
  }

  // Stage environment (CloudFront distribution)
  if (hostname.includes('cloudfront.net') || hostname.includes('amazonaws.com')) {
    return 'stage';
  }

  // Development environment (localhost on any port)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'dev';
  }

  // Default to development for unknown domains
  return 'dev';
}

const env = detectEnvironment();

let envConfig: {
  CONFIG: ConfigInterface;
  isDevelopment: () => boolean;
  isStage: () => boolean;
  isProduction: () => boolean;
  isAuthEnabled: () => boolean;
};

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