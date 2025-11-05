/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create data_export_requests table
  pgm.createTable('data_export_requests', {
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
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
    },
    export_format: {
      type: 'varchar(20)',
      notNull: true,
      default: 'json',
    },
    file_url: {
      type: 'text',
    },
    requested_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    completed_at: {
      type: 'timestamp',
    },
    expires_at: {
      type: 'timestamp',
    },
  });

  pgm.createIndex('data_export_requests', 'user_id');
  pgm.createIndex('data_export_requests', 'status');

  // Create account_deletion_requests table
  pgm.createTable('account_deletion_requests', {
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
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
    },
    reason: {
      type: 'text',
    },
    requested_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    scheduled_deletion_at: {
      type: 'timestamp',
    },
    completed_at: {
      type: 'timestamp',
    },
    cancelled_at: {
      type: 'timestamp',
    },
  });

  pgm.createIndex('account_deletion_requests', 'user_id');
  pgm.createIndex('account_deletion_requests', 'status');
  pgm.createIndex('account_deletion_requests', 'scheduled_deletion_at');

  // Create consent_tracking table
  pgm.createTable('consent_tracking', {
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
    consent_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    consent_version: {
      type: 'varchar(50)',
      notNull: true,
    },
    granted: {
      type: 'boolean',
      notNull: true,
    },
    granted_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    revoked_at: {
      type: 'timestamp',
    },
    ip_address: {
      type: 'varchar(45)',
    },
    user_agent: {
      type: 'text',
    },
  });

  pgm.createIndex('consent_tracking', 'user_id');
  pgm.createIndex('consent_tracking', ['user_id', 'consent_type']);
  pgm.createIndex('consent_tracking', 'granted_at');
};

exports.down = (pgm) => {
  pgm.dropTable('consent_tracking');
  pgm.dropTable('account_deletion_requests');
  pgm.dropTable('data_export_requests');
};
