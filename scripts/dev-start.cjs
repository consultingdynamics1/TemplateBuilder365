#!/usr/bin/env node
/**
 * Complete Development Environment Startup Script
 * Cleans ports and starts all required services in the correct order
 */

const { spawn } = require('child_process');
const { cleanupPorts, DEV_PORTS } = require('./cleanup-ports.cjs');
const path = require('path');

console.log('🚀 Starting TemplateBuilder365 Development Environment');
console.log('📋 Standard Ports: Frontend:5174, MockAPI:3000, Converter:3001');

// Track running processes for cleanup
const runningProcesses = [];

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  runningProcesses.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGINT');
    }
  });
  process.exit(0);
});

/**
 * Start a process and track it
 */
function startProcess(name, command, args, options = {}) {
  console.log(`\n🔧 Starting ${name}...`);

  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options
  });

  runningProcesses.push(proc);

  proc.on('error', (error) => {
    console.error(`❌ ${name} failed to start:`, error);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ ${name} exited with code ${code}`);
    }
  });

  return proc;
}

/**
 * Wait for a specific amount of time
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main startup sequence
 */
async function startDevelopment() {
  try {
    // Step 1: Clean up ports
    console.log('\n📝 Step 1: Cleaning up ports...');
    await cleanupPorts();

    // Step 2: Replace environment variables
    console.log('\n📝 Step 2: Setting up development environment...');
    const replaceVars = startProcess(
      'Variable Replacement',
      'node',
      ['scripts/replace-variables.js', 'development'],
      { stdio: 'pipe' }
    );

    // Wait for variable replacement to complete
    await new Promise((resolve, reject) => {
      replaceVars.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ Environment variables configured');
          resolve();
        } else {
          reject(new Error(`Variable replacement failed with code ${code}`));
        }
      });
    });

    // Step 3: Start mock converter server
    console.log('\n📝 Step 3: Starting Mock Converter Server (port 3001)...');
    startProcess(
      'Mock Converter Server',
      'node',
      ['mock-converter-server.cjs']
    );

    // Wait a moment for the converter to start
    await delay(2000);

    // Step 4: Start frontend dev server
    console.log('\n📝 Step 4: Starting Frontend Dev Server (port 5174)...');
    startProcess(
      'Frontend Dev Server',
      'npx',
      ['vite']  // Use vite directly since variables are already replaced
    );

    // Step 5: Show startup summary
    console.log('\n🎉 Development Environment Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 Frontend:        http://localhost:5174');
    console.log('🔧 Mock Converter:  http://localhost:3001');
    console.log('🔧 Mock API:        http://localhost:3000 (optional)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Press Ctrl+C to stop all services');
    console.log('🔧 Environment: Development (auth disabled, Base64 images)');

    // Keep the script running
    await new Promise(() => {}); // Run indefinitely

  } catch (error) {
    console.error('❌ Failed to start development environment:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { startDevelopment };

// Run directly if called from command line
if (require.main === module) {
  startDevelopment();
}