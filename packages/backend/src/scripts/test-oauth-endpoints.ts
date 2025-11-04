#!/usr/bin/env node

/**
 * OAuth Endpoints Test Script
 * Tests if OAuth endpoints are accessible
 */

// Use built-in fetch (Node 18+) or axios
const fetch = globalThis.fetch;

const API_URL = 'http://localhost:4000';

async function testEndpoint(url: string, description: string) {
  try {
    console.log(`Testing ${description}...`);
    const response = await fetch(url, { 
      method: 'GET',
      redirect: 'manual' // Don't follow redirects, just check if endpoint exists
    });
    
    // OAuth endpoints should redirect (302) or return some response
    if (response.status === 302 || response.status === 200) {
      console.log(`✅ ${description}: OK (Status: ${response.status})`);
      if (response.status === 302) {
        console.log(`   Redirects to: ${response.headers.get('location')}`);
      }
    } else {
      console.log(`❌ ${description}: Failed (Status: ${response.status})`);
    }
  } catch (error) {
    console.log(`❌ ${description}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function main() {
  console.log('🔍 Testing OAuth Endpoints...\n');
  
  // Test health endpoint first
  await testEndpoint(`${API_URL}/health`, 'Health Check');
  
  // Test OAuth endpoints
  await testEndpoint(`${API_URL}/api/auth/oauth/google`, 'Google OAuth Initiation');
  await testEndpoint(`${API_URL}/api/auth/oauth/linkedin`, 'LinkedIn OAuth Initiation');
  
  console.log('\n✨ OAuth endpoints test complete!');
}

main().catch(console.error);