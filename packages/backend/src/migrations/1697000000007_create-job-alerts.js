/**
 * Migration: Create job alerts and notifications tables
 */

exports.up = (pgm) => {
  // Job alerts table
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
    },
    frequency: {
      type: 'varchar(20)',
      notNull: true,
      check: "frequency IN ('realtime', 'daily', 'weekly')",
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    last_triggered: {
      type: 'timestamp',
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

  // Notifications table
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
    data: {
      type: 'jsonb',
    },
    read: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Indexes
  pgm.createIndex('job_alerts', 'user_id');
  pgm.createIndex('job_alerts', 'active');
  pgm.createIndex('job_alerts', ['user_id', 'active']);
  pgm.createIndex('notifications', 'user_id');
  pgm.createIndex('notifications', ['user_id', 'read']);
  pgm.createIndex('notifications', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('notifications');
  pgm.dropTable('job_alerts');
};
