#!/usr/bin/env tsx

import { pgPool } from '../config/database';

async function createMissingTables() {
  try {
    console.log('🔧 Creating missing database tables...\n');

    // Create career_goals table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS career_goals (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_role VARCHAR(255) NOT NULL,
        target_companies TEXT[] DEFAULT '{}',
        target_salary INTEGER,
        timeframe VARCHAR(100),
        required_skills TEXT[] DEFAULT '{}',
        skill_gaps TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created career_goals table');

    // Create blockchain_credentials table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS blockchain_credentials (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_type VARCHAR(50) NOT NULL,
        credential_hash VARCHAR(255) NOT NULL,
        encrypted_data TEXT NOT NULL,
        blockchain_tx_id VARCHAR(255),
        issuer VARCHAR(255),
        expiry_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created blockchain_credentials table');

    // Create access_grants table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS access_grants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        credential_id UUID NOT NULL REFERENCES blockchain_credentials(id) ON DELETE CASCADE,
        granted_to VARCHAR(255) NOT NULL,
        granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created access_grants table');

    // Create access_logs table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        credential_id UUID NOT NULL REFERENCES blockchain_credentials(id) ON DELETE CASCADE,
        access_token VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        accessor VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created access_logs table');

    // Create user_profiles table if it doesn't exist
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_score DECIMAL(5,2) DEFAULT 0,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created user_profiles table');

    // Create skills table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
        years_of_experience DECIMAL(4,1),
        endorsements INTEGER DEFAULT 0,
        last_used DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created skills table');

    // Create experience table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS experience (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        current BOOLEAN DEFAULT FALSE,
        description TEXT,
        achievements TEXT[],
        skills TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created experience table');

    // Create education table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS education (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        institution VARCHAR(255) NOT NULL,
        degree VARCHAR(100) NOT NULL,
        field_of_study VARCHAR(100),
        start_date DATE NOT NULL,
        end_date DATE,
        gpa DECIMAL(3,2),
        credential_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created education table');

    // Create jobs table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        external_id VARCHAR(255) NOT NULL,
        source VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        remote_type VARCHAR(20),
        job_type VARCHAR(50),
        salary_min INTEGER,
        salary_max INTEGER,
        description TEXT,
        requirements TEXT[],
        responsibilities TEXT[],
        benefits TEXT[],
        posted_date TIMESTAMP,
        application_deadline TIMESTAMP,
        apply_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(external_id, source)
      );
    `);
    console.log('✅ Created jobs table');

    // Create applications table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id),
        status VARCHAR(50) NOT NULL,
        applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resume_id UUID,
        cover_letter_id UUID,
        application_method VARCHAR(50),
        follow_up_date DATE,
        interview_date TIMESTAMP,
        offer_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created applications table');

    // Create application_notes table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS application_notes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created application_notes table');

    // Create application_timeline table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS application_timeline (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        metadata JSONB
      );
    `);
    console.log('✅ Created application_timeline table');

    // Create saved_jobs table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(user_id, job_id)
      );
    `);
    console.log('✅ Created saved_jobs table');

    // Create job_alerts table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS job_alerts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        criteria JSONB NOT NULL,
        frequency VARCHAR(50) DEFAULT 'daily',
        active BOOLEAN DEFAULT TRUE,
        last_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created job_alerts table');

    // Create interview_prep table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS interview_prep (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id),
        questions JSONB,
        company_research JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created interview_prep table');

    // Create practice_sessions table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS practice_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        interview_prep_id UUID NOT NULL REFERENCES interview_prep(id) ON DELETE CASCADE,
        question_id VARCHAR(255),
        response TEXT,
        feedback JSONB,
        score INTEGER,
        practiced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('✅ Created practice_sessions table');

    // Create oauth_providers table if it doesn't exist
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS oauth_providers (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(provider, provider_id)
      );
    `);
    console.log('✅ Created oauth_providers table');

    // Add indexes for performance
    await pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_blockchain_credentials_user_id ON blockchain_credentials(user_id);
      CREATE INDEX IF NOT EXISTS idx_access_grants_credential_id ON access_grants(credential_id);
      CREATE INDEX IF NOT EXISTS idx_access_logs_credential_id ON access_logs(credential_id);
      CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
      CREATE INDEX IF NOT EXISTS idx_experience_user_id ON experience(user_id);
      CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id);
      CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON job_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_interview_prep_user_id ON interview_prep(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
    `);
    console.log('✅ Created indexes');

    console.log('\n🎉 All missing tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await pgPool.end();
  }
}

createMissingTables();