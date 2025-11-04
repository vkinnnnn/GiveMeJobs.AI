-- GiveMeJobs Database Setup Script
-- Run this to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  professional_headline VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(255),
  linkedin_url VARCHAR(500),
  github_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  bio TEXT,
  blockchain_address VARCHAR(255),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- OAuth accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
  years_of_experience DECIMAL(4,1),
  last_used_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work experience table
CREATE TABLE IF NOT EXISTS work_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  achievements TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Education table
CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  institution VARCHAR(255) NOT NULL,
  degree VARCHAR(255) NOT NULL,
  field_of_study VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  gpa DECIMAL(3,2),
  achievements TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255),
  source VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  remote_type VARCHAR(50),
  job_type VARCHAR(50),
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT,
  requirements TEXT[],
  responsibilities TEXT[],
  benefits TEXT[],
  posted_date TIMESTAMP,
  apply_url TEXT,
  company_logo VARCHAR(500),
  industry VARCHAR(100),
  experience_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, external_id)
);

-- Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'applied',
  applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resume_used UUID,
  cover_letter_used UUID,
  notes TEXT,
  follow_up_date DATE,
  interview_date TIMESTAMP,
  offer_amount INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  format VARCHAR(50),
  file_path VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job alerts table
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  keywords TEXT[],
  location VARCHAR(255),
  remote_only BOOLEAN DEFAULT FALSE,
  job_type VARCHAR(50),
  salary_min INTEGER,
  frequency VARCHAR(50) DEFAULT 'daily',
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_work_exp_user_id ON work_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source, external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'GiveMeJobs database setup completed successfully!';
  RAISE NOTICE 'Tables created: users, oauth_accounts, skills, work_experience, education, jobs, saved_jobs, applications, documents, job_alerts, refresh_tokens, audit_logs';
END $$;
