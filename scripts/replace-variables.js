#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function replaceVariables(environment) {
  if (!environment) {
    console.error('Usage: node replace-variables.js <environment>');
    console.error('Available environments: development, stage, production');
    process.exit(1);
  }

  const configPath = path.join(__dirname, 'config', `${environment}.json`);

  if (!fs.existsSync(configPath)) {
    console.error(`Configuration file not found: ${configPath}`);
    process.exit(1);
  }

  console.log(`Loading configuration for ${environment}...`);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Files to process
  const filesToProcess = [
    'src/config/environment.ts'
  ];

  console.log('Replacing variables in source files...');

  filesToProcess.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found, skipping: ${fullPath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let replacements = 0;

    // Replace all {{VARIABLE}} placeholders
    Object.entries(config).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);

      if (matches) {
        content = content.replace(regex, value);
        replacements += matches.length;
        console.log(`  ${filePath}: ${placeholder} → "${value}" (${matches.length} replacements)`);
      }
    });

    if (replacements > 0) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`  ✅ Updated ${filePath} (${replacements} total replacements)`);
    } else {
      console.log(`  ⚠️  No variables found in ${filePath}`);
    }
  });

  console.log(`\n✅ Variable replacement completed for ${environment} environment`);
  console.log('📝 Modified files have been updated in place');
  console.log('⚠️  Remember to restore original templates before switching environments');
}

// Run the script
const environment = process.argv[2];
replaceVariables(environment);