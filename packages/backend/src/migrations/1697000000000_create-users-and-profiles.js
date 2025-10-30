/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    first_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    last_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    professional_headline: {
      type: 'varchar(255)',
    },
    blockchain_address: {
      type: 'varchar(255)',
    },
    mfa_enabled: {
      type: 'boolean',
      default: false,
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
    last_login: {
      type: 'timestamp',
    },
  });

  // Create index on email for faster lookups
  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'created_at');

  // Create OAuth providers table
  pgm.createTable('oauth_providers', {
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
    provider: {
      type: 'varchar(50)',
      notNull: true,
    },
    provider_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    access_token: {
      type: 'text',
    },
    refresh_token: {
      type: 'text',
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

  pgm.createIndex('oauth_providers', 'user_id');
  pgm.createIndex('oauth_providers', ['provider', 'provider_id'], { unique: true });

  // Create user_profiles table
  pgm.createTable('user_profiles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    skill_score: {
      type: 'decimal(5,2)',
      default: 0,
    },
    preferences: {
      type: 'jsonb',
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

  pgm.createIndex('user_profiles', 'user_id');
  pgm.createIndex('user_profiles', 'skill_score');

  // Create career_goals table
  pgm.createTable('career_goals', {
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
    target_role: {
      type: 'varchar(255)',
      notNull: true,
    },
    target_companies: {
      type: 'text[]',
      default: '{}',
    },
    target_salary: {
      type: 'integer',
    },
    timeframe: {
      type: 'varchar(100)',
    },
    required_skills: {
      type: 'text[]',
      default: '{}',
    },
    skill_gaps: {
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

  pgm.createIndex('career_goals', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('career_goals');
  pgm.dropTable('user_profiles');
  pgm.dropTable('oauth_providers');
  pgm.dropTable('users');
  pgm.dropExtension('uuid-ossp');
};
