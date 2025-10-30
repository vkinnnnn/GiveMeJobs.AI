import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test Pinecone Configuration
 * Run with: npm run test:pinecone
 */
async function testPinecone() {
  console.log('🧪 Testing Pinecone Configuration...\n');

  if (!process.env.PINECONE_API_KEY) {
    console.log('❌ Pinecone API key not configured');
    console.log('   Missing: PINECONE_API_KEY in .env');
    console.log('   See SERVICE_CONFIGURATION_GUIDE.md for setup instructions');
    process.exit(1);
  }

  if (!process.env.PINECONE_INDEX_NAME) {
    console.log('❌ Pinecone index name not configured');
    console.log('   Missing: PINECONE_INDEX_NAME in .env');
    console.log('   Default should be: givemejobs-jobs');
    process.exit(1);
  }

  console.log('✅ Pinecone credentials found');
  console.log(`   API Key: ${process.env.PINECONE_API_KEY.substring(0, 10)}...`);
  console.log(`   Index Name: ${process.env.PINECONE_INDEX_NAME}`);
  console.log('');

  try {
    console.log('🔍 Connecting to Pinecone...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    console.log('✅ Pinecone client initialized');
    console.log('');

    // List indexes
    console.log('🔍 Listing indexes...');
    const indexes = await pinecone.listIndexes();
    console.log(`✅ Found ${indexes.indexes?.length || 0} index(es)`);
    
    if (indexes.indexes && indexes.indexes.length > 0) {
      indexes.indexes.forEach((index) => {
        console.log(`   - ${index.name} (${index.dimension} dimensions, ${index.metric} metric)`);
      });
    }
    console.log('');

    // Check if our index exists
    const indexName = process.env.PINECONE_INDEX_NAME;
    const indexExists = indexes.indexes?.some((idx) => idx.name === indexName);

    if (indexExists) {
      console.log(`✅ Index "${indexName}" exists`);
      
      // Get index stats
      console.log('🔍 Getting index stats...');
      const index = pinecone.index(indexName);
      const stats = await index.describeIndexStats();
      
      console.log('✅ Index stats:');
      console.log(`   Total vectors: ${stats.totalRecordCount || 0}`);
      console.log(`   Dimensions: ${stats.dimension || 'N/A'}`);
      console.log('');

      console.log('✅ All Pinecone tests passed!');
      console.log('\n💡 Your Pinecone index is ready for:');
      console.log('   - Job embeddings storage');
      console.log('   - Semantic job search');
      console.log('   - Job matching recommendations');
    } else {
      console.log(`⚠️  Index "${indexName}" does not exist`);
      console.log('\n💡 To create the index:');
      console.log('   1. Go to https://app.pinecone.io/');
      console.log('   2. Click "Create Index"');
      console.log(`   3. Name: ${indexName}`);
      console.log('   4. Dimensions: 1536 (for OpenAI embeddings)');
      console.log('   5. Metric: cosine');
      console.log('   6. Pod Type: starter (free tier)');
    }

    // Force exit to avoid hanging on Windows
    setTimeout(() => process.exit(0), 100);
  } catch (error: any) {
    console.error('❌ Pinecone test failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify your API key is correct');
    console.error('   - Check your Pinecone dashboard: https://app.pinecone.io/');
    console.error('   - Ensure the index exists and is active');
    console.error('   - Check Pinecone status: https://status.pinecone.io/');
    setTimeout(() => process.exit(1), 100);
  }
}

testPinecone();
