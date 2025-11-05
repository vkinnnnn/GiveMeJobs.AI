/**
 * Migration: Create password reset tokens table
 * Handles secure password reset functionality
 */

exports.up = function (pgm) {
  // Create password reset tokens table
  pgm.createTable('password_reset_tokens', {
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
    token: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    expires_at: {
      type: 'timestamp',
      notNull: true,
    },
    used: {
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

  // Create indexes for performance
  pgm.createIndex('password_reset_tokens', 'user_id');
  pgm.createIndex('password_reset_tokens', 'token');
  pgm.createIndex('password_reset_tokens', ['expires_at', 'used']);
  pgm.createIndex('password_reset_tokens', 'created_at');
};

exports.down = function (pgm) {
  pgm.dropTable('password_reset_tokens', { cascade: true });
};