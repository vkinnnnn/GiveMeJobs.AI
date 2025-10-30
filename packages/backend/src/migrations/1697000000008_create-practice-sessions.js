/**
 * Migration: Create practice_sessions table
 * Creates table for storing interview practice sessions and responses
 */

exports.up = async function (db) {
  // Create practice_sessions table
  await db.runSql(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      interview_prep_id UUID NOT NULL REFERENCES interview_prep(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id VARCHAR(255) NOT NULL,
      question_text TEXT NOT NULL,
      response TEXT NOT NULL,
      recording_url TEXT,
      transcript TEXT,
      duration INTEGER,
      analysis JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes
  await db.runSql(`
    CREATE INDEX idx_practice_sessions_prep ON practice_sessions(interview_prep_id);
    CREATE INDEX idx_practice_sessions_user ON practice_sessions(user_id);
    CREATE INDEX idx_practice_sessions_created ON practice_sessions(created_at);
  `);

  console.log('✓ Created practice_sessions table');
};

exports.down = async function (db) {
  await db.runSql(`DROP TABLE IF EXISTS practice_sessions CASCADE;`);
  console.log('✓ Dropped practice_sessions table');
};

exports._meta = {
  version: 1,
};
