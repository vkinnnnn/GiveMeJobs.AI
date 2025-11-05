/**
 * Migration: Add reminder_sent_at column to interview_prep table
 * Tracks when interview reminders were sent
 */

exports.up = function (pgm) {
  pgm.addColumn('interview_prep', {
    reminder_sent_at: {
      type: 'timestamp',
      notNull: false
    }
  });

  pgm.createIndex('interview_prep', ['interview_date', 'reminder_sent_at'], {
    name: 'idx_interview_prep_reminder',
    where: 'interview_date IS NOT NULL'
  });

  console.log('✓ Added reminder_sent_at column to interview_prep table');
};

exports.down = function (pgm) {
  pgm.dropIndex('interview_prep', ['interview_date', 'reminder_sent_at'], {
    name: 'idx_interview_prep_reminder'
  });

  pgm.dropColumn('interview_prep', 'reminder_sent_at');

  console.log('✓ Removed reminder_sent_at column from interview_prep table');
};
