/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create applications table
  pgm.createTable('applications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    job_id: {
      type: 'uuid',
      notNull: true,
      references: 'jobs',
      onDelete: 'CASCADE',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'saved',
    },
    applied_date: {
      type: 'timestamp',
      default: pgm.func('current_timestamp'),
    },
    last_updated: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    resume_id: {
      type: 'uuid',
    },
    cover_letter_id: {
      type: 'uuid',
    },
    application_method: {
      type: 'varchar(50)',
    },
    follow_up_date: {
      type: 'date',
    },
    interview_date: {
      type: 'timestamp',
    },
    offer_details: {
      type: 'jsonb',
    },
    rejection_reason: {
      type: 'text',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes for performance
  pgm.createIndex('applications', 'user_id');
  pgm.createIndex('applications', 'job_id');
  pgm.createIndex('applications', 'status');
  pgm.createIndex('applications', 'applied_date');
  pgm.createIndex('applications', ['user_id', 'status']);
  pgm.createIndex('applications', ['user_id', 'applied_date']);

  // Create application_notes table
  pgm.createTable('application_notes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications',
      onDelete: 'CASCADE',
    },
    content: {
      type: 'text',
      notNull: true,
    },
    note_type: {
      type: 'varchar(50)',
      default: 'general',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('application_notes', 'application_id');
  pgm.createIndex('application_notes', 'created_at');

  // Create application_timeline table
  pgm.createTable('application_timeline', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications',
      onDelete: 'CASCADE',
    },
    event_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: true,
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('application_timeline', 'application_id');
  pgm.createIndex('application_timeline', 'created_at');
  pgm.createIndex('application_timeline', ['application_id', 'created_at']);

  // Create interview_prep table
  pgm.createTable('interview_prep', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    application_id: {
      type: 'uuid',
      notNull: true,
      references: 'applications',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    job_id: {
      type: 'uuid',
      notNull: true,
      references: 'jobs',
      onDelete: 'CASCADE',
    },
    interview_date: {
      type: 'timestamp',
    },
    questions: {
      type: 'jsonb',
      default: '[]',
    },
    company_research: {
      type: 'jsonb',
      default: '{}',
    },
    tips: {
      type: 'text[]',
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('interview_prep', 'application_id');
  pgm.createIndex('interview_prep', 'user_id');
  pgm.createIndex('interview_prep', 'interview_date');

  // Create practice_sessions table
  pgm.createTable('practice_sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    interview_prep_id: {
      type: 'uuid',
      notNull: true,
      references: 'interview_prep',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    question_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    response: {
      type: 'text',
      notNull: true,
    },
    recording_url: {
      type: 'text',
    },
    transcript: {
      type: 'text',
    },
    duration: {
      type: 'integer',
    },
    analysis: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('practice_sessions', 'interview_prep_id');
  pgm.createIndex('practice_sessions', 'user_id');
  pgm.createIndex('practice_sessions', 'created_at');

  // Create notifications table
  pgm.createTable('notifications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    message: {
      type: 'text',
      notNull: true,
    },
    link: {
      type: 'text',
    },
    read: {
      type: 'boolean',
      default: false,
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('notifications', 'user_id');
  pgm.createIndex('notifications', 'read');
  pgm.createIndex('notifications', 'created_at');
  pgm.createIndex('notifications', ['user_id', 'read']);
};

exports.down = (pgm) => {
  pgm.dropTable('notifications');
  pgm.dropTable('practice_sessions');
  pgm.dropTable('interview_prep');
  pgm.dropTable('application_timeline');
  pgm.dropTable('application_notes');
  pgm.dropTable('applications');
};
