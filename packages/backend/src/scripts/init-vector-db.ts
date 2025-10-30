import dotenv from 'dotenv';
import { initPinecone } from '../config/pinecone.config';
import { vectorDbService } from '../services/vector-db.service';

dotenv.config();

async function initVectorDatabase() {
  console.log('🚀 Initializing Vector Database...\n');

  try {
    // Initialize Pinecone client
    console.log('1. Connecting to Pinecone...');
    await initPinecone();
    console.log('✅ Connected to Pinecone\n');

    // Ensure index exists
    console.log('2. Checking/Creating Pinecone index...');
    await vectorDbService.ensureIndexExists();
    console.log('✅ Index ready\n');

    console.log('🎉 Vector database initialization complete!\n');
    console.log('Next steps:');
    console.log('- Add jobs to the database');
    console.log('- Run: npm run jobs:embed to generate embeddings for existing jobs');
    console.log('- Test recommendations: GET /api/jobs/recommendations\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing vector database:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check that PINECONE_API_KEY is set in .env');
    console.error('2. Check that OPENAI_API_KEY is set in .env');
    console.error('3. Verify your Pinecone account is active');
    console.error('4. Check network connectivity\n');
    process.exit(1);
  }
}

initVectorDatabase();
