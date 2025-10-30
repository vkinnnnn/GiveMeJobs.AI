/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create skills table
  pgm.createTable('skills', {
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
      type: 'varchar(100)',
      notNull: true,
    },
    category: {
      type: 'varchar(50)',
    },
    proficiency_level: {
      type: 'integer',
      notNull: true,
      check: 'proficiency_level BETWEEN 1 AND 5',
    },
    years_of_experience: {
      type: 'decimal(4,1)',
      default: 0,
    },
    endorsements: {
      type: 'integer',
      default: 0,
    },
    last_used: {
      type: 'date',
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

  // Create indexes for performance
  pgm.createIndex('skills', 'user_id');
  pgm.createIndex('skills', 'name');
  pgm.createIndex('skills', 'category');
  pgm.createIndex('skills', ['user_id', 'name'], { unique: true });

  // Create skill_score_history table for tracking progress
  pgm.createTable('skill_score_history', {
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
    score: {
      type: 'decimal(5,2)',
      notNull: true,
    },
    trigger: {
      type: 'varchar(50)',
      notNull: true,
    },
    breakdown: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('skill_score_history', 'user_id');
  pgm.createIndex('skill_score_history', 'created_at');
  pgm.createIndex('skill_score_history', ['user_id', 'created_at']);

  // Create certifications table
  pgm.createTable('certifications', {
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
    issuing_organization: {
      type: 'varchar(255)',
      notNull: true,
    },
    issue_date: {
      type: 'date',
      notNull: true,
    },
    expiry_date: {
      type: 'date',
    },
    credential_id: {
      type: 'varchar(255)',
    },
    credential_url: {
      type: 'text',
    },
    credential_hash: {
      type: 'varchar(255)',
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

  pgm.createIndex('certifications', 'user_id');
  pgm.createIndex('certifications', 'issue_date');
};

exports.down = (pgm) => {
  pgm.dropTable('certifications');
  pgm.dropTable('skill_score_history');
  pgm.dropTable('skills');
};
