#!/usr/bin/env node
/**
 * Port Cleanup Script for TemplateBuilder365 Development
 * Kills all processes on our development ports to ensure clean startup
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

// Define our standard development ports
const DEV_PORTS = {
  frontend: 5174,      // Vite dev server
  mockApi: 3000,       // Mock API server
  converter: 3001,     // Mock converter server
  serverless: 3000     // Serverless offline (same as mockApi)
};

console.log('🧹 Cleaning up development ports...');
console.log('📋 Target ports:', Object.entries(DEV_PORTS).map(([name, port]) => `${name}:${port}`).join(', '));

/**
 * Kill processes on Windows
 */
function killPortWindows(port) {
  try {
    // Find process using the port
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(line => line.trim());

    const pids = new Set();
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[4];
        if (pid && pid !== '0') {
          pids.add(pid);
        }
      }
    });

    if (pids.size > 0) {
      console.log(`🔫 Killing port ${port} (PIDs: ${Array.from(pids).join(', ')})`);
      pids.forEach(pid => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch (error) {
          // Process might already be dead, ignore
        }
      });
      return true;
    } else {
      console.log(`✅ Port ${port} is already free`);
      return false;
    }
  } catch (error) {
    console.log(`✅ Port ${port} is free (no processes found)`);
    return false;
  }
}

/**
 * Kill processes on Unix/Linux/Mac
 */
function killPortUnix(port) {
  try {
    const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
    const pids = result.trim().split('\n').filter(pid => pid);

    if (pids.length > 0) {
      console.log(`🔫 Killing port ${port} (PIDs: ${pids.join(', ')})`);
      pids.forEach(pid => {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        } catch (error) {
          // Process might already be dead, ignore
        }
      });
      return true;
    } else {
      console.log(`✅ Port ${port} is already free`);
      return false;
    }
  } catch (error) {
    console.log(`✅ Port ${port} is free (no processes found)`);
    return false;
  }
}

/**
 * Kill process on a specific port (cross-platform)
 */
function killPort(port) {
  if (os.platform() === 'win32') {
    return killPortWindows(port);
  } else {
    return killPortUnix(port);
  }
}

/**
 * Main cleanup function
 */
function cleanupPorts() {
  let killedAny = false;

  // Kill processes on all our development ports
  Object.entries(DEV_PORTS).forEach(([name, port]) => {
    const killed = killPort(port);
    if (killed) killedAny = true;
  });

  // Also kill any node processes that might be running our servers
  if (os.platform() === 'win32') {
    try {
      console.log('🔫 Cleaning up any remaining Node.js dev servers...');
      execSync('taskkill /f /im node.exe /fi "WINDOWTITLE eq *mock*" 2>nul', { stdio: 'ignore' });
      execSync('taskkill /f /im node.exe /fi "WINDOWTITLE eq *vite*" 2>nul', { stdio: 'ignore' });
    } catch (error) {
      // Ignore errors - processes might not exist
    }
  }

  if (killedAny) {
    console.log('⏳ Waiting 2 seconds for processes to fully terminate...');
    return new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log('✨ All ports were already clean!');
    return Promise.resolve();
  }
}

// Export for use in other scripts
module.exports = { cleanupPorts, DEV_PORTS };

// Run directly if called from command line
if (require.main === module) {
  cleanupPorts().then(() => {
    console.log('🎉 Port cleanup complete!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Port cleanup failed:', error);
    process.exit(1);
  });
}