/**
 * Migration: Create interview_prep table
 * Creates table for storing AI-generated interview preparation materials
 */

exports.up = async function (db) {
  // Create interview_prep table
  await db.runSql(`
    CREATE TABLE IF NOT EXISTS interview_prep (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE SET NULL,
      questions JSONB NOT NULL DEFAULT '[]',
      company_research JSONB NOT NULL DEFAULT '{}',
      tips JSONB NOT NULL DEFAULT '[]',
      interview_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes
  await db.runSql(`
    CREATE INDEX idx_interview_prep_application ON interview_prep(application_id);
    CREATE INDEX idx_interview_prep_user ON interview_prep(user_id);
    CREATE INDEX idx_interview_prep_job ON interview_prep(job_id);
    CREATE INDEX idx_interview_prep_interview_date ON interview_prep(interview_date);
  `);

  console.log('✓ Created interview_prep table');
};

exports.down = async function (db) {
  await db.runSql(`DROP TABLE IF EXISTS interview_prep CASCADE;`);
  console.log('✓ Dropped interview_prep table');
};

exports._meta = {
  version: 1,
};
