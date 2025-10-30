#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if all dependencies are installed and configured correctly
 */

const fs = require('fs');
const path = require('path');

const requiredDependencies = [
  'express',
  'pg',
  'mongodb',
  'redis',
  'bcrypt',
  'jsonwebtoken',
  'zod',
  'passport',
  'passport-google-oauth20',
  'passport-linkedin-oauth2',
  'nodemailer',
  'uuid',
];

const requiredDevDependencies = [
  '@types/node',
  '@types/express',
  '@types/pg',
  '@types/bcrypt',
  '@types/jsonwebtoken',
  '@types/passport',
  '@types/nodemailer',
  '@types/uuid',
  'typescript',
];

console.log('🔍 Verifying backend setup...\n');

let hasErrors = false;

// Check if node_modules exists
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.error('❌ node_modules directory not found');
  console.error('   Run: npm install\n');
  hasErrors = true;
} else {
  console.log('✅ node_modules directory exists');
}

// Check package.json
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  hasErrors = true;
} else {
  console.log('✅ package.json exists');
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check dependencies
  console.log('\n📦 Checking dependencies...');
  requiredDependencies.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      const depPath = path.join(__dirname, 'node_modules', dep);
      if (fs.existsSync(depPath)) {
        console.log(`  ✅ ${dep}`);
      } else {
        console.log(`  ⚠️  ${dep} (in package.json but not installed)`);
        hasErrors = true;
      }
    } else {
      console.log(`  ❌ ${dep} (missing from package.json)`);
      hasErrors = true;
    }
  });
  
  // Check dev dependencies
  console.log('\n🛠️  Checking dev dependencies...');
  requiredDevDependencies.forEach(dep => {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      const depPath = path.join(__dirname, 'node_modules', dep);
      if (fs.existsSync(depPath)) {
        console.log(`  ✅ ${dep}`);
      } else {
        console.log(`  ⚠️  ${dep} (in package.json but not installed)`);
        hasErrors = true;
      }
    } else {
      console.log(`  ❌ ${dep} (missing from package.json)`);
      hasErrors = true;
    }
  });
}

// Check TypeScript config
console.log('\n⚙️  Checking TypeScript configuration...');
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('  ✅ tsconfig.json exists');
} else {
  console.log('  ❌ tsconfig.json not found');
  hasErrors = true;
}

// Check source files
console.log('\n📄 Checking source files...');
const requiredFiles = [
  'src/index.ts',
  'src/services/auth.service.ts',
  'src/services/oauth.service.ts',
  'src/services/email.service.ts',
  'src/controllers/auth.controller.ts',
  'src/controllers/oauth.controller.ts',
  'src/routes/auth.routes.ts',
  'src/middleware/auth.middleware.ts',
  'src/utils/auth.utils.ts',
  'src/config/passport.config.ts',
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (missing)`);
    hasErrors = true;
  }
});

// Check environment file
console.log('\n🔐 Checking environment configuration...');
const envPath = path.join(__dirname, '..', '..', '.env');
const envExamplePath = path.join(__dirname, '..', '..', '.env.example');

if (fs.existsSync(envPath)) {
  console.log('  ✅ .env file exists');
} else if (fs.existsSync(envExamplePath)) {
  console.log('  ⚠️  .env file not found (copy from .env.example)');
  console.log('     Run: cp ../../.env.example ../../.env');
} else {
  console.log('  ❌ Neither .env nor .env.example found');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Setup verification FAILED');
  console.log('\nTo fix issues:');
  console.log('1. Run: npm install');
  console.log('2. Copy .env.example to .env');
  console.log('3. Run this script again: node verify-setup.js');
  process.exit(1);
} else {
  console.log('✅ Setup verification PASSED');
  console.log('\nYou can now:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Run type check: npm run type-check');
  console.log('3. Run migrations: npm run migrate:up');
}
console.log('='.repeat(50) + '\n');
