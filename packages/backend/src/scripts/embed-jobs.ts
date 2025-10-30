import dotenv from 'dotenv';
import { pgPool } from '../config/database';
import { initPinecone } from '../config/pinecone.config';
import { vectorDbService } from '../services/vector-db.service';
import { Job } from '../types/job.types';

dotenv.config();

async function embedExistingJobs() {
  console.log('🚀 Generating embeddings for existing jobs...\n');

  try {
    // Initialize Pinecone
    console.log('1. Connecting to Pinecone...');
    await initPinecone();
    await vectorDbService.initialize();
    console.log('✅ Connected to Pinecone\n');

    // Get all jobs from database
    console.log('2. Fetching jobs from database...');
    const query = `
      SELECT 
        id, external_id, source, title, company, location, remote_type,
        job_type, salary_min, salary_max, description, requirements,
        responsibilities, benefits, posted_date, application_deadline,
        apply_url, company_logo, industry, experience_level,
        created_at, updated_at
      FROM jobs
      ORDER BY created_at DESC
    `;

    const result = await pgPool.query(query);
    const jobs: Job[] = result.rows.map((row) => ({
      id: row.id,
      externalId: row.external_id,
      source: row.source,
      title: row.title,
      company: row.company,
      location: row.location,
      remoteType: row.remote_type,
      jobType: row.job_type,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      description: row.description,
      requirements: row.requirements || [],
      responsibilities: row.responsibilities || [],
      benefits: row.benefits || [],
      postedDate: new Date(row.posted_date),
      applicationDeadline: row.application_deadline
        ? new Date(row.application_deadline)
        : undefined,
      applyUrl: row.apply_url,
      companyLogo: row.company_logo,
      industry: row.industry,
      experienceLevel: row.experience_level,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    console.log(`✅ Found ${jobs.length} jobs\n`);

    if (jobs.length === 0) {
      console.log('ℹ️  No jobs found in database. Add some jobs first.');
      process.exit(0);
    }

    // Generate embeddings in batches
    console.log('3. Generating embeddings...');
    const batchSize = 10;
    let processed = 0;

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await vectorDbService.storeJobEmbeddings(batch);
      processed += batch.length;
      console.log(`   Processed ${processed}/${jobs.length} jobs`);
    }

    console.log('✅ All embeddings generated\n');

    console.log('🎉 Job embedding complete!\n');
    console.log('You can now:');
    console.log('- Test recommendations: GET /api/jobs/recommendations');
    console.log('- Test match analysis: GET /api/jobs/:jobId/match-analysis\n');

    await pgPool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check that OPENAI_API_KEY is set in .env');
    console.error('2. Check that PINECONE_API_KEY is set in .env');
    console.error('3. Verify database connection');
    console.error('4. Check OpenAI API rate limits\n');
    await pgPool.end();
    process.exit(1);
  }
}

embedExistingJobs();
