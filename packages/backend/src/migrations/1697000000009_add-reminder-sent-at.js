/**
 * Migration: Add reminder_sent_at column to interview_prep table
 * Tracks when interview reminders were sent
 */

exports.up = async function (db) {
  await db.runSql(`
    ALTER TABLE interview_prep
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
  `);

  await db.runSql(`
    CREATE INDEX IF NOT EXISTS idx_interview_prep_reminder 
    ON interview_prep(interview_date, reminder_sent_at)
    WHERE interview_date IS NOT NULL;
  `);

  console.log('✓ Added reminder_sent_at column to interview_prep table');
};

exports.down = async function (db) {
  await db.runSql(`
    DROP INDEX IF EXISTS idx_interview_prep_reminder;
  `);

  await db.runSql(`
    ALTER TABLE interview_prep
    DROP COLUMN IF EXISTS reminder_sent_at;
  `);

  console.log('✓ Removed reminder_sent_at column from interview_prep table');
};

exports._meta = {
  version: 1,
};
