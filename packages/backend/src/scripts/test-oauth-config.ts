#!/usr/bin/env node

/**
 * OAuth Configuration Test Script
 * Tests if OAuth providers are properly configured
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🔍 Testing OAuth Configuration...\n');

// Test Google OAuth
console.log('📱 Google OAuth Configuration:');
console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL || 'Using default');

// Test LinkedIn OAuth
console.log('\n💼 LinkedIn OAuth Configuration:');
console.log('  LINKEDIN_CLIENT_ID:', process.env.LINKEDIN_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('  LINKEDIN_CLIENT_SECRET:', process.env.LINKEDIN_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  LINKEDIN_CALLBACK_URL:', process.env.LINKEDIN_CALLBACK_URL || 'Using default');

// Test other required variables
console.log('\n🌐 Other Configuration:');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || '❌ Missing');
console.log('  API_URL:', process.env.API_URL || 'Using default');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');

// Test database connections
console.log('\n💾 Database Configuration:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('  REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Missing');

console.log('\n🔗 OAuth URLs that will be used:');
const apiUrl = process.env.API_URL || 'http://localhost:4000';
console.log('  Google OAuth:', `${apiUrl}/api/auth/oauth/google`);
console.log('  Google Callback:', process.env.GOOGLE_CALLBACK_URL || `${apiUrl}/api/auth/oauth/google/callback`);
console.log('  LinkedIn OAuth:', `${apiUrl}/api/auth/oauth/linkedin`);
console.log('  LinkedIn Callback:', process.env.LINKEDIN_CALLBACK_URL || `${apiUrl}/api/auth/oauth/linkedin/callback`);

console.log('\n✨ Configuration test complete!');