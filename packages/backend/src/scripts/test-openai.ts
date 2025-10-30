import OpenAI from 'openai';

/**
 * Test OpenAI Configuration
 * Run with: npm run test:openai
 */
async function testOpenAI() {
  console.log('🧪 Testing OpenAI Configuration...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OpenAI API key not configured');
    console.log('   Missing: OPENAI_API_KEY in .env');
    console.log('   See SERVICE_CONFIGURATION_GUIDE.md for setup instructions');
    process.exit(1);
  }

  console.log('✅ OpenAI API key found');
  console.log(`   Key: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
  console.log('');

  try {
    console.log('🔍 Testing OpenAI API connection...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from GiveMeJobs!" if you can read this.',
        },
      ],
      max_tokens: 20,
    });

    console.log('✅ OpenAI API connection successful!');
    console.log(`   Response: ${completion.choices[0].message.content}`);
    console.log(`   Model: ${completion.model}`);
    console.log(`   Tokens used: ${completion.usage?.total_tokens}`);
    console.log('');

    // Test embeddings
    console.log('🔍 Testing OpenAI Embeddings...');
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'Test embedding for GiveMeJobs',
    });

    console.log('✅ OpenAI Embeddings working!');
    console.log(`   Embedding dimensions: ${embedding.data[0].embedding.length}`);
    console.log(`   Tokens used: ${embedding.usage.total_tokens}`);
    console.log('');

    console.log('✅ All OpenAI tests passed!');
    console.log('\n💡 Your OpenAI API is ready to use for:');
    console.log('   - Resume generation');
    console.log('   - Cover letter generation');
    console.log('   - Interview preparation');
    console.log('   - Job matching (embeddings)');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ OpenAI test failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify your API key is correct');
    console.error('   - Check you have credits/payment method set up');
    console.error('   - Visit: https://platform.openai.com/account/billing');
    console.error('   - Check API status: https://status.openai.com/');
    process.exit(1);
  }
}

testOpenAI();
