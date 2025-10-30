import { Index, RecordMetadata } from '@pinecone-database/pinecone';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_DIMENSION } from '../config/pinecone.config';
import { embeddingService } from './embedding.service';
import { Job } from '../types/job.types';

interface JobMetadata extends RecordMetadata {
  jobId: string;
  title: string;
  company: string;
  location: string;
  source: string;
  externalId: string;
}

export class VectorDbService {
  private index: Index<JobMetadata> | null = null;

  async initialize(): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      this.index = pinecone.index<JobMetadata>(PINECONE_INDEX_NAME);
      console.log('Vector database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize vector database:', error);
      throw error;
    }
  }

  private getIndex(): Index<JobMetadata> {
    if (!this.index) {
      throw new Error('Vector database not initialized. Call initialize() first.');
    }
    return this.index;
  }

  /**
   * Store job embedding in vector database
   */
  async storeJobEmbedding(job: Job): Promise<void> {
    try {
      const index = this.getIndex();
      
      // Create text representation of job
      const jobText = embeddingService.createJobText({
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        location: job.location,
        industry: job.industry,
      });

      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(jobText);

      // Store in Pinecone
      await index.upsert([
        {
          id: job.id,
          values: embedding,
          metadata: {
            jobId: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            source: job.source,
            externalId: job.externalId,
          },
        },
      ]);

      console.log(`Stored embedding for job: ${job.id}`);
    } catch (error) {
      console.error('Error storing job embedding:', error);
      throw error;
    }
  }

  /**
   * Store multiple job embeddings in batch
   */
  async storeJobEmbeddings(jobs: Job[]): Promise<void> {
    try {
      const index = this.getIndex();
      
      // Create text representations
      const jobTexts = jobs.map((job) =>
        embeddingService.createJobText({
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          location: job.location,
          industry: job.industry,
        })
      );

      // Generate embeddings in batch
      const embeddings = await embeddingService.generateEmbeddings(jobTexts);

      // Prepare vectors for upsert
      const vectors = jobs.map((job, i) => ({
        id: job.id,
        values: embeddings[i],
        metadata: {
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          externalId: job.externalId,
        },
      }));

      // Upsert in batches of 100 (Pinecone limit)
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
      }

      console.log(`Stored embeddings for ${jobs.length} jobs`);
    } catch (error) {
      console.error('Error storing job embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for user profile
   */
  async generateProfileEmbedding(profile: {
    skills: Array<{ name: string; proficiencyLevel: number; yearsOfExperience: number }>;
    experience: Array<{ title: string; company: string; description: string; skills: string[] }>;
    education: Array<{ degree: string; fieldOfStudy: string; institution: string }>;
    careerGoals?: Array<{ targetRole: string }>;
  }): Promise<number[]> {
    const profileText = embeddingService.createProfileText(profile);
    return embeddingService.generateEmbedding(profileText);
  }

  /**
   * Find similar jobs based on profile embedding
   */
  async findSimilarJobs(
    profileEmbedding: number[],
    topK: number = 50,
    filter?: Record<string, any>
  ): Promise<Array<{ jobId: string; score: number; metadata: JobMetadata }>> {
    try {
      const index = this.getIndex();

      const queryResponse = await index.query({
        vector: profileEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      return (
        queryResponse.matches?.map((match) => ({
          jobId: match.id,
          score: match.score || 0,
          metadata: match.metadata as JobMetadata,
        })) || []
      );
    } catch (error) {
      console.error('Error finding similar jobs:', error);
      throw error;
    }
  }

  /**
   * Delete job embedding
   */
  async deleteJobEmbedding(jobId: string): Promise<void> {
    try {
      const index = this.getIndex();
      await index.deleteOne(jobId);
      console.log(`Deleted embedding for job: ${jobId}`);
    } catch (error) {
      console.error('Error deleting job embedding:', error);
      throw error;
    }
  }

  /**
   * Check if index exists and create if needed
   */
  async ensureIndexExists(): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const indexes = await pinecone.listIndexes();
      
      const indexExists = indexes.indexes?.some((idx) => idx.name === PINECONE_INDEX_NAME);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${PINECONE_INDEX_NAME}`);
        await pinecone.createIndex({
          name: PINECONE_INDEX_NAME,
          dimension: PINECONE_DIMENSION,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });
        console.log('Index created successfully');
        
        // Wait for index to be ready
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      await this.initialize();
    } catch (error) {
      console.error('Error ensuring index exists:', error);
      throw error;
    }
  }
}

export const vectorDbService = new VectorDbService();
