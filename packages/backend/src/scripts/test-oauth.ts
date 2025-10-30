/**
 * Test OAuth Configuration
 * Run with: npm run test:oauth
 */

console.log('🧪 Testing OAuth Configuration...\n');

// Check Google OAuth
console.log('🔍 Checking Google OAuth:');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('✅ Google OAuth credentials found');
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  console.log(`   Callback URL: ${process.env.GOOGLE_CALLBACK_URL || process.env.API_URL + '/api/auth/oauth/google/callback'}`);
} else {
  console.log('❌ Google OAuth not configured');
  console.log('   Missing: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET');
  console.log('   See SERVICE_CONFIGURATION_GUIDE.md for setup instructions');
}

console.log('');

// Check LinkedIn OAuth
console.log('🔍 Checking LinkedIn OAuth:');
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  console.log('✅ LinkedIn OAuth credentials found');
  console.log(`   Client ID: ${process.env.LINKEDIN_CLIENT_ID.substring(0, 20)}...`);
  console.log(`   Callback URL: ${process.env.LINKEDIN_CALLBACK_URL || process.env.API_URL + '/api/auth/oauth/linkedin/callback'}`);
} else {
  console.log('❌ LinkedIn OAuth not configured');
  console.log('   Missing: LINKEDIN_CLIENT_ID and/or LINKEDIN_CLIENT_SECRET');
  console.log('   See SERVICE_CONFIGURATION_GUIDE.md for setup instructions');
}

console.log('');

// Summary
const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const linkedinConfigured = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);

console.log('📊 Summary:');
console.log(`   Google OAuth: ${googleConfigured ? '✅ Configured' : '❌ Not configured'}`);
console.log(`   LinkedIn OAuth: ${linkedinConfigured ? '✅ Configured' : '❌ Not configured'}`);

if (googleConfigured || linkedinConfigured) {
  console.log('\n✅ OAuth is partially or fully configured');
  console.log('\n🧪 To test OAuth manually:');
  console.log('   1. Start the backend: npm run dev');
  if (googleConfigured) {
    console.log('   2. Visit: http://localhost:4000/api/auth/oauth/google');
  }
  if (linkedinConfigured) {
    console.log('   3. Visit: http://localhost:4000/api/auth/oauth/linkedin');
  }
  console.log('   4. You should be redirected to the OAuth provider');
} else {
  console.log('\n❌ OAuth is not configured');
  console.log('   See SERVICE_CONFIGURATION_GUIDE.md for setup instructions');
}

console.log('');
