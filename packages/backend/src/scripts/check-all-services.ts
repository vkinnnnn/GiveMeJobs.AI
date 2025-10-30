import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Comprehensive Service Status Check
 * Run with: npm run check:all
 */

console.log('🔍 GiveMeJobs Service Status Check\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

interface ServiceStatus {
  name: string;
  status: 'configured' | 'missing' | 'partial';
  required: boolean;
  details?: string;
}

const services: ServiceStatus[] = [];

// Check Database Services
console.log('📊 Database Services');
console.log('─────────────────────────────────────────────────────────────────');

// PostgreSQL
const postgresConfigured = !!(process.env.DATABASE_URL);
services.push({
  name: 'PostgreSQL',
  status: postgresConfigured ? 'configured' : 'missing',
  required: true,
  details: postgresConfigured ? process.env.DATABASE_URL?.split('@')[1] : 'Not configured',
});
console.log(`${postgresConfigured ? '✅' : '❌'} PostgreSQL: ${postgresConfigured ? 'Configured' : 'Missing'}`);
if (postgresConfigured) {
  console.log(`   ${process.env.DATABASE_URL?.split('@')[1]}`);
}

// MongoDB
const mongoConfigured = !!(process.env.MONGODB_URI);
services.push({
  name: 'MongoDB',
  status: mongoConfigured ? 'configured' : 'missing',
  required: true,
  details: mongoConfigured ? process.env.MONGODB_URI?.split('@')[1]?.split('?')[0] : 'Not configured',
});
console.log(`${mongoConfigured ? '✅' : '❌'} MongoDB: ${mongoConfigured ? 'Configured' : 'Missing'}`);
if (mongoConfigured) {
  console.log(`   ${process.env.MONGODB_URI?.split('@')[1]?.split('?')[0]}`);
}

// Redis
const redisConfigured = !!(process.env.REDIS_URL);
services.push({
  name: 'Redis',
  status: redisConfigured ? 'configured' : 'missing',
  required: true,
  details: redisConfigured ? 'localhost:6379' : 'Not configured',
});
console.log(`${redisConfigured ? '✅' : '❌'} Redis: ${redisConfigured ? 'Configured' : 'Missing'}`);
if (redisConfigured) {
  console.log(`   localhost:6379`);
}

console.log('');

// Check Authentication Services
console.log('🔐 Authentication Services');
console.log('─────────────────────────────────────────────────────────────────');

// JWT
const jwtConfigured = !!(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET);
services.push({
  name: 'JWT',
  status: jwtConfigured ? 'configured' : 'missing',
  required: true,
});
console.log(`${jwtConfigured ? '✅' : '❌'} JWT Secrets: ${jwtConfigured ? 'Configured' : 'Missing'}`);

// Google OAuth
const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
services.push({
  name: 'Google OAuth',
  status: googleConfigured ? 'configured' : 'missing',
  required: false,
  details: googleConfigured ? `Client ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...` : 'Not configured',
});
console.log(`${googleConfigured ? '✅' : '⚠️ '} Google OAuth: ${googleConfigured ? 'Configured' : 'Not configured'}`);
if (googleConfigured) {
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
  console.log(`   Callback: ${process.env.GOOGLE_CALLBACK_URL || process.env.API_URL + '/api/auth/oauth/google/callback'}`);
}

// LinkedIn OAuth
const linkedinConfigured = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
services.push({
  name: 'LinkedIn OAuth',
  status: linkedinConfigured ? 'configured' : 'missing',
  required: false,
  details: linkedinConfigured ? `Client ID: ${process.env.LINKEDIN_CLIENT_ID?.substring(0, 20)}...` : 'Not configured',
});
console.log(`${linkedinConfigured ? '✅' : '⚠️ '} LinkedIn OAuth: ${linkedinConfigured ? 'Configured' : 'Not configured'}`);
if (linkedinConfigured) {
  console.log(`   Client ID: ${process.env.LINKEDIN_CLIENT_ID?.substring(0, 20)}...`);
  console.log(`   Callback: ${process.env.LINKEDIN_CALLBACK_URL || process.env.API_URL + '/api/auth/oauth/linkedin/callback'}`);
}

console.log('');

// Check Communication Services
console.log('📧 Communication Services');
console.log('─────────────────────────────────────────────────────────────────');

// Email
const emailConfigured = !!(process.env.SENDGRID_API_KEY);
const emailPartial = !emailConfigured && process.env.NODE_ENV === 'development';
services.push({
  name: 'Email Service',
  status: emailConfigured ? 'configured' : emailPartial ? 'partial' : 'missing',
  required: false,
  details: emailConfigured ? 'SendGrid' : emailPartial ? 'Ethereal (dev only)' : 'Not configured',
});
console.log(`${emailConfigured ? '✅' : emailPartial ? '⚠️ ' : '❌'} Email Service: ${emailConfigured ? 'SendGrid configured' : emailPartial ? 'Development mode (Ethereal)' : 'Not configured'}`);
if (emailConfigured) {
  console.log(`   API Key: ${process.env.SENDGRID_API_KEY?.substring(0, 10)}...`);
  console.log(`   From: ${process.env.EMAIL_FROM}`);
} else if (emailPartial) {
  console.log(`   Using Ethereal Email for development`);
  console.log(`   Configure SendGrid for production`);
}

console.log('');

// Check AI Services
console.log('🤖 AI & ML Services');
console.log('─────────────────────────────────────────────────────────────────');

// OpenAI
const openaiConfigured = !!(process.env.OPENAI_API_KEY);
services.push({
  name: 'OpenAI',
  status: openaiConfigured ? 'configured' : 'missing',
  required: false,
  details: openaiConfigured ? `Key: ${process.env.OPENAI_API_KEY?.substring(0, 10)}...` : 'Not configured',
});
console.log(`${openaiConfigured ? '✅' : '⚠️ '} OpenAI: ${openaiConfigured ? 'Configured' : 'Not configured'}`);
if (openaiConfigured) {
  console.log(`   API Key: ${process.env.OPENAI_API_KEY?.substring(0, 10)}...`);
}

// Pinecone
const pineconeConfigured = !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME);
const pineconePartial = !!(process.env.PINECONE_API_KEY) && !process.env.PINECONE_INDEX_NAME;
services.push({
  name: 'Pinecone',
  status: pineconeConfigured ? 'configured' : pineconePartial ? 'partial' : 'missing',
  required: false,
  details: pineconeConfigured ? `Index: ${process.env.PINECONE_INDEX_NAME}` : 'Not configured',
});
console.log(`${pineconeConfigured ? '✅' : pineconePartial ? '⚠️ ' : '⚠️ '} Pinecone: ${pineconeConfigured ? 'Configured' : pineconePartial ? 'Partial (missing index name)' : 'Not configured'}`);
if (pineconeConfigured) {
  console.log(`   API Key: ${process.env.PINECONE_API_KEY?.substring(0, 10)}...`);
  console.log(`   Index: ${process.env.PINECONE_INDEX_NAME}`);
}

console.log('');

// Check External APIs
console.log('💼 Job Board APIs');
console.log('─────────────────────────────────────────────────────────────────');

// Indeed
const indeedConfigured = !!(process.env.INDEED_API_KEY);
services.push({
  name: 'Indeed API',
  status: indeedConfigured ? 'configured' : 'missing',
  required: false,
});
console.log(`${indeedConfigured ? '✅' : '⚠️ '} Indeed API: ${indeedConfigured ? 'Configured' : 'Not configured'}`);

// Glassdoor
const glassdoorConfigured = !!(process.env.GLASSDOOR_API_KEY);
services.push({
  name: 'Glassdoor API',
  status: glassdoorConfigured ? 'configured' : 'missing',
  required: false,
});
console.log(`${glassdoorConfigured ? '✅' : '⚠️ '} Glassdoor API: ${glassdoorConfigured ? 'Configured' : 'Not configured'}`);

console.log('');

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const requiredServices = services.filter((s) => s.required);
const optionalServices = services.filter((s) => !s.required);

const requiredConfigured = requiredServices.filter((s) => s.status === 'configured').length;
const optionalConfigured = optionalServices.filter((s) => s.status === 'configured').length;

console.log(`Required Services: ${requiredConfigured}/${requiredServices.length} configured`);
requiredServices.forEach((s) => {
  console.log(`  ${s.status === 'configured' ? '✅' : '❌'} ${s.name}`);
});

console.log('');
console.log(`Optional Services: ${optionalConfigured}/${optionalServices.length} configured`);
optionalServices.forEach((s) => {
  const icon = s.status === 'configured' ? '✅' : s.status === 'partial' ? '⚠️ ' : '⚠️ ';
  console.log(`  ${icon} ${s.name}`);
});

console.log('');

// Recommendations
const allRequiredConfigured = requiredServices.every((s) => s.status === 'configured');

if (allRequiredConfigured) {
  console.log('✅ All required services are configured!');
  console.log('   Your app is ready to run.\n');
  
  if (optionalConfigured < optionalServices.length) {
    console.log('💡 To enable more features, configure:');
    optionalServices
      .filter((s) => s.status !== 'configured')
      .forEach((s) => {
        console.log(`   - ${s.name}`);
      });
    console.log('');
  }
} else {
  console.log('❌ Some required services are missing!');
  console.log('   Configure these services before running the app:');
  requiredServices
    .filter((s) => s.status !== 'configured')
    .forEach((s) => {
      console.log(`   - ${s.name}`);
    });
  console.log('');
}

// Next steps
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Next Steps');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!allRequiredConfigured || optionalConfigured === 0) {
  console.log('1. Configure services:');
  console.log('   npm run setup:services    (interactive setup)');
  console.log('   or edit .env file manually\n');
}

console.log('2. Test services:');
console.log('   npm run test:services     (test all)');
console.log('   npm run test:oauth        (test OAuth)');
console.log('   npm run test:email        (test email)');
console.log('   npm run test:openai       (test OpenAI)');
console.log('   npm run test:pinecone     (test Pinecone)\n');

console.log('3. Read documentation:');
console.log('   QUICK_SERVICE_SETUP.md           (quick start)');
console.log('   SERVICE_CONFIGURATION_GUIDE.md   (detailed guide)\n');

if (allRequiredConfigured) {
  console.log('4. Start the application:');
  console.log('   npm run dev\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
