/**
 * Career Goals Migration
 * Creates career_goals table for storing user career objectives
 */

exports.up = (pgm) => {
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
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create index on user_id for faster lookups
  pgm.createIndex('career_goals', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('career_goals');
};
