/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create experience table
  pgm.createTable('experience', {
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
    company: {
      type: 'varchar(255)',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    start_date: {
      type: 'date',
      notNull: true,
    },
    end_date: {
      type: 'date',
    },
    current: {
      type: 'boolean',
      default: false,
    },
    description: {
      type: 'text',
    },
    achievements: {
      type: 'text[]',
      default: '{}',
    },
    skills: {
      type: 'text[]',
      default: '{}',
    },
    location: {
      type: 'varchar(255)',
    },
    employment_type: {
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

  // Create indexes for performance
  pgm.createIndex('experience', 'user_id');
  pgm.createIndex('experience', 'company');
  pgm.createIndex('experience', 'start_date');
  pgm.createIndex('experience', ['user_id', 'start_date']);

  // Create education table
  pgm.createTable('education', {
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
    institution: {
      type: 'varchar(255)',
      notNull: true,
    },
    degree: {
      type: 'varchar(100)',
      notNull: true,
    },
    field_of_study: {
      type: 'varchar(100)',
    },
    start_date: {
      type: 'date',
      notNull: true,
    },
    end_date: {
      type: 'date',
    },
    current: {
      type: 'boolean',
      default: false,
    },
    gpa: {
      type: 'decimal(3,2)',
    },
    activities: {
      type: 'text[]',
      default: '{}',
    },
    description: {
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

  // Create indexes for performance
  pgm.createIndex('education', 'user_id');
  pgm.createIndex('education', 'institution');
  pgm.createIndex('education', 'start_date');
  pgm.createIndex('education', ['user_id', 'start_date']);

  // Create portfolio_items table
  pgm.createTable('portfolio_items', {
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
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    url: {
      type: 'text',
    },
    project_type: {
      type: 'varchar(50)',
    },
    technologies: {
      type: 'text[]',
      default: '{}',
    },
    start_date: {
      type: 'date',
    },
    end_date: {
      type: 'date',
    },
    images: {
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

  pgm.createIndex('portfolio_items', 'user_id');
  pgm.createIndex('portfolio_items', 'project_type');
};

exports.down = (pgm) => {
  pgm.dropTable('portfolio_items');
  pgm.dropTable('education');
  pgm.dropTable('experience');
};
