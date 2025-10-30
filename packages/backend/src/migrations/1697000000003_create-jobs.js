/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create jobs table (cached from external sources)
  pgm.createTable('jobs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    external_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    source: {
      type: 'varchar(50)',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    company: {
      type: 'varchar(255)',
      notNull: true,
    },
    location: {
      type: 'varchar(255)',
    },
    remote_type: {
      type: 'varchar(20)',
    },
    job_type: {
      type: 'varchar(50)',
    },
    salary_min: {
      type: 'integer',
    },
    salary_max: {
      type: 'integer',
    },
    description: {
      type: 'text',
    },
    requirements: {
      type: 'text[]',
      default: '{}',
    },
    responsibilities: {
      type: 'text[]',
      default: '{}',
    },
    benefits: {
      type: 'text[]',
      default: '{}',
    },
    posted_date: {
      type: 'timestamp',
    },
    application_deadline: {
      type: 'timestamp',
    },
    apply_url: {
      type: 'text',
    },
    company_logo: {
      type: 'text',
    },
    industry: {
      type: 'varchar(100)',
    },
    experience_level: {
      type: 'varchar(50)',
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

  // Create unique constraint on external_id and source
  pgm.addConstraint('jobs', 'unique_external_job', {
    unique: ['external_id', 'source'],
  });

  // Create indexes for performance
  pgm.createIndex('jobs', 'title');
  pgm.createIndex('jobs', 'company');
  pgm.createIndex('jobs', 'location');
  pgm.createIndex('jobs', 'remote_type');
  pgm.createIndex('jobs', 'job_type');
  pgm.createIndex('jobs', 'posted_date');
  pgm.createIndex('jobs', 'source');
  pgm.createIndex('jobs', ['external_id', 'source']);

  // Create saved_jobs table
  pgm.createTable('saved_jobs', {
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
    notes: {
      type: 'text',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('saved_jobs', 'unique_user_job', {
    unique: ['user_id', 'job_id'],
  });

  pgm.createIndex('saved_jobs', 'user_id');
  pgm.createIndex('saved_jobs', 'job_id');

  // Create job_alerts table
  pgm.createTable('job_alerts', {
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    criteria: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    frequency: {
      type: 'varchar(20)',
      notNull: true,
      default: 'daily',
    },
    active: {
      type: 'boolean',
      default: true,
    },
    last_triggered: {
      type: 'timestamp',
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

  pgm.createIndex('job_alerts', 'user_id');
  pgm.createIndex('job_alerts', 'active');
  pgm.createIndex('job_alerts', 'frequency');

  // Create job_match_scores table
  pgm.createTable('job_match_scores', {
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
    overall_score: {
      type: 'decimal(5,2)',
      notNull: true,
    },
    breakdown: {
      type: 'jsonb',
      default: '{}',
    },
    matching_skills: {
      type: 'text[]',
      default: '{}',
    },
    missing_skills: {
      type: 'text[]',
      default: '{}',
    },
    recommendations: {
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

  pgm.addConstraint('job_match_scores', 'unique_user_job_match', {
    unique: ['user_id', 'job_id'],
  });

  pgm.createIndex('job_match_scores', 'user_id');
  pgm.createIndex('job_match_scores', 'job_id');
  pgm.createIndex('job_match_scores', 'overall_score');
};

exports.down = (pgm) => {
  pgm.dropTable('job_match_scores');
  pgm.dropTable('job_alerts');
  pgm.dropTable('saved_jobs');
  pgm.dropTable('jobs');
};
