/**
 * Migration: Add performance indexes for frequently queried fields
 */

exports.up = async function (knex) {
  // Users table indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)');

  // User profiles indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_user_profiles_skill_score ON user_profiles(skill_score DESC)');

  // Skills indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_skills_proficiency ON skills(proficiency_level DESC)');

  // Experience indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_experience_user_id ON experience(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_experience_current ON experience(current) WHERE current = true');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_experience_dates ON experience(start_date DESC, end_date DESC)');

  // Education indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_education_dates ON education(start_date DESC, end_date DESC)');

  // Jobs table indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id, source)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(salary_min, salary_max)');
  
  // Full-text search index for job title and description
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_jobs_title_search 
    ON jobs USING gin(to_tsvector('english', title))
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_jobs_description_search 
    ON jobs USING gin(to_tsvector('english', description))
  `);

  // Applications table indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_applied_date ON applications(applied_date DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_last_updated ON applications(last_updated DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_applications_interview_date ON applications(interview_date) WHERE interview_date IS NOT NULL');

  // Application notes indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_application_notes_application_id ON application_notes(application_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_application_notes_created_at ON application_notes(created_at DESC)');

  // Job alerts indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON job_alerts(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_job_alerts_active ON job_alerts(active) WHERE active = true');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_job_alerts_frequency ON job_alerts(frequency)');

  // Interview prep indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_interview_prep_application_id ON interview_prep(application_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_interview_prep_user_id ON interview_prep(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_interview_prep_interview_date ON interview_prep(interview_date) WHERE interview_date IS NOT NULL');

  // Practice sessions indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_practice_sessions_prep_id ON practice_sessions(interview_prep_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at DESC)');

  // Career goals indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_goals(user_id)');

  // Blockchain credentials indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_blockchain_credentials_user_id ON blockchain_credentials(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_blockchain_credentials_type ON blockchain_credentials(credential_type)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_blockchain_credentials_hash ON blockchain_credentials(credential_hash)');

  // OAuth providers indexes
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider, provider_id)');

  console.log('✅ Performance indexes created successfully');
};

exports.down = async function (knex) {
  // Drop all indexes
  const indexes = [
    // Users
    'idx_users_email',
    'idx_users_last_login',
    'idx_users_created_at',
    
    // User profiles
    'idx_user_profiles_user_id',
    'idx_user_profiles_skill_score',
    
    // Skills
    'idx_skills_user_id',
    'idx_skills_name',
    'idx_skills_category',
    'idx_skills_proficiency',
    
    // Experience
    'idx_experience_user_id',
    'idx_experience_current',
    'idx_experience_dates',
    
    // Education
    'idx_education_user_id',
    'idx_education_dates',
    
    // Jobs
    'idx_jobs_source',
    'idx_jobs_external_id',
    'idx_jobs_posted_date',
    'idx_jobs_location',
    'idx_jobs_remote_type',
    'idx_jobs_job_type',
    'idx_jobs_company',
    'idx_jobs_salary',
    'idx_jobs_title_search',
    'idx_jobs_description_search',
    
    // Applications
    'idx_applications_user_id',
    'idx_applications_job_id',
    'idx_applications_status',
    'idx_applications_applied_date',
    'idx_applications_last_updated',
    'idx_applications_user_status',
    'idx_applications_interview_date',
    
    // Application notes
    'idx_application_notes_application_id',
    'idx_application_notes_created_at',
    
    // Job alerts
    'idx_job_alerts_user_id',
    'idx_job_alerts_active',
    'idx_job_alerts_frequency',
    
    // Interview prep
    'idx_interview_prep_application_id',
    'idx_interview_prep_user_id',
    'idx_interview_prep_interview_date',
    
    // Practice sessions
    'idx_practice_sessions_prep_id',
    'idx_practice_sessions_user_id',
    'idx_practice_sessions_created_at',
    
    // Career goals
    'idx_career_goals_user_id',
    
    // Blockchain credentials
    'idx_blockchain_credentials_user_id',
    'idx_blockchain_credentials_type',
    'idx_blockchain_credentials_hash',
    
    // OAuth providers
    'idx_oauth_providers_user_id',
    'idx_oauth_providers_provider',
  ];

  for (const index of indexes) {
    await knex.raw(`DROP INDEX IF EXISTS ${index}`);
  }

  console.log('✅ Performance indexes dropped successfully');
};
