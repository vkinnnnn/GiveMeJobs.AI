import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interactive Service Setup Script
 * Run with: npm run setup:services
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setupServices() {
  console.log('🚀 GiveMeJobs Service Configuration Setup\n');
  console.log('This script will help you configure external services.\n');
  console.log('Press Enter to skip any service you want to configure later.\n');

  const envPath = path.join(process.cwd(), '../../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Google OAuth
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Google OAuth Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Get credentials from: https://console.cloud.google.com/\n');

  const googleClientId = await question('Google Client ID: ');
  if (googleClientId.trim()) {
    envContent = envContent.replace(
      /GOOGLE_CLIENT_ID=.*/,
      `GOOGLE_CLIENT_ID=${googleClientId.trim()}`
    );
  }

  const googleClientSecret = await question('Google Client Secret: ');
  if (googleClientSecret.trim()) {
    envContent = envContent.replace(
      /GOOGLE_CLIENT_SECRET=.*/,
      `GOOGLE_CLIENT_SECRET=${googleClientSecret.trim()}`
    );
  }

  // LinkedIn OAuth
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 LinkedIn OAuth Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Get credentials from: https://www.linkedin.com/developers/\n');

  const linkedinClientId = await question('LinkedIn Client ID: ');
  if (linkedinClientId.trim()) {
    envContent = envContent.replace(
      /LINKEDIN_CLIENT_ID=.*/,
      `LINKEDIN_CLIENT_ID=${linkedinClientId.trim()}`
    );
  }

  const linkedinClientSecret = await question('LinkedIn Client Secret: ');
  if (linkedinClientSecret.trim()) {
    envContent = envContent.replace(
      /LINKEDIN_CLIENT_SECRET=.*/,
      `LINKEDIN_CLIENT_SECRET=${linkedinClientSecret.trim()}`
    );
  }

  // SendGrid
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 SendGrid Email Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Get API key from: https://app.sendgrid.com/\n');

  const sendgridApiKey = await question('SendGrid API Key: ');
  if (sendgridApiKey.trim()) {
    envContent = envContent.replace(
      /SENDGRID_API_KEY=.*/,
      `SENDGRID_API_KEY=${sendgridApiKey.trim()}`
    );
  }

  const emailFrom = await question('Email From Address (e.g., noreply@yourdomain.com): ');
  if (emailFrom.trim()) {
    envContent = envContent.replace(
      /EMAIL_FROM=.*/,
      `EMAIL_FROM=${emailFrom.trim()}`
    );
  }

  // OpenAI
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 OpenAI Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Get API key from: https://platform.openai.com/api-keys\n');

  const openaiApiKey = await question('OpenAI API Key: ');
  if (openaiApiKey.trim()) {
    envContent = envContent.replace(
      /OPENAI_API_KEY=.*/,
      `OPENAI_API_KEY=${openaiApiKey.trim()}`
    );
  }

  // Pinecone
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Pinecone Vector Database Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Get API key from: https://app.pinecone.io/\n');

  const pineconeApiKey = await question('Pinecone API Key: ');
  if (pineconeApiKey.trim()) {
    envContent = envContent.replace(
      /PINECONE_API_KEY=.*/,
      `PINECONE_API_KEY=${pineconeApiKey.trim()}`
    );
  }

  const pineconeIndex = await question('Pinecone Index Name (default: givemejobs-jobs): ');
  if (pineconeIndex.trim()) {
    envContent = envContent.replace(
      /PINECONE_INDEX_NAME=.*/,
      `PINECONE_INDEX_NAME=${pineconeIndex.trim()}`
    );
  }

  // Save .env file
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💾 Saving configuration...');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Configuration saved to .env\n');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Configuration Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Google OAuth: ${googleClientId ? '✅ Configured' : '⏭️  Skipped'}`);
  console.log(`LinkedIn OAuth: ${linkedinClientId ? '✅ Configured' : '⏭️  Skipped'}`);
  console.log(`SendGrid Email: ${sendgridApiKey ? '✅ Configured' : '⏭️  Skipped'}`);
  console.log(`OpenAI: ${openaiApiKey ? '✅ Configured' : '⏭️  Skipped'}`);
  console.log(`Pinecone: ${pineconeApiKey ? '✅ Configured' : '⏭️  Skipped'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Next Steps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test your services with:');
  console.log('  npm run test:services    - Test all services');
  console.log('  npm run test:oauth       - Test OAuth configuration');
  console.log('  npm run test:email       - Test email service');
  console.log('  npm run test:openai      - Test OpenAI API');
  console.log('  npm run test:pinecone    - Test Pinecone');
  console.log('\nFor detailed setup instructions, see:');
  console.log('  SERVICE_CONFIGURATION_GUIDE.md');
  console.log('');

  rl.close();
}

setupServices().catch((error) => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});
