import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export const initPinecone = async (): Promise<Pinecone> => {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    console.warn('PINECONE_API_KEY not set. Vector search will be disabled.');
    throw new Error('Pinecone API key not configured');
  }

  pineconeClient = new Pinecone({
    apiKey,
  });

  return pineconeClient;
};

export const getPineconeClient = (): Pinecone => {
  if (!pineconeClient) {
    throw new Error('Pinecone client not initialized. Call initPinecone() first.');
  }
  return pineconeClient;
};

export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'givemejobs-jobs';
export const PINECONE_DIMENSION = 1536; // OpenAI embedding dimension
