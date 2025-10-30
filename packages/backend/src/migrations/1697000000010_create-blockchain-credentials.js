/**
 * Migration: Create blockchain credentials tables
 * 
 * This migration creates tables for:
 * - blockchain_credentials: Store credential metadata and blockchain references
 * - access_grants: Manage time-limited access to credentials
 * - access_logs: Audit trail of all credential access attempts
 */

exports.up = (pgm) => {
  // Blockchain credentials table
  pgm.createTable('blockchain_credentials', {
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
    credential_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "credential_type IN ('degree', 'certification', 'transcript', 'license')",
    },
    credential_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    encrypted_data: {
      type: 'text',
      notNull: true,
    },
    encryption_iv: {
      type: 'varchar(255)',
      notNull: true,
    },
    encryption_auth_tag: {
      type: 'varchar(255)',
      notNull: true,
    },
    blockchain_tx_id: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    block_number: {
      type: 'integer',
      notNull: true,
    },
    issuer: {
      type: 'varchar(255)',
      notNull: true,
    },
    expiry_date: {
      type: 'timestamp',
    },
    metadata: {
      type: 'jsonb',
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

  // Access grants table
  pgm.createTable('access_grants', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    credential_id: {
      type: 'uuid',
      notNull: true,
      references: 'blockchain_credentials',
      onDelete: 'CASCADE',
    },
    granted_to: {
      type: 'varchar(255)',
      notNull: true,
    },
    granted_by: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    access_token: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    expires_at: {
      type: 'timestamp',
      notNull: true,
    },
    revoked: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    revoked_at: {
      type: 'timestamp',
    },
    purpose: {
      type: 'text',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Access logs table
  pgm.createTable('access_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    credential_id: {
      type: 'uuid',
      notNull: true,
      references: 'blockchain_credentials',
      onDelete: 'CASCADE',
    },
    grant_id: {
      type: 'uuid',
      references: 'access_grants',
      onDelete: 'SET NULL',
    },
    action: {
      type: 'varchar(50)',
      notNull: true,
      check: "action IN ('granted', 'accessed', 'revoked', 'verification_requested', 'verification_completed')",
    },
    accessor: {
      type: 'varchar(255)',
      notNull: true,
    },
    ip_address: {
      type: 'varchar(45)',
    },
    user_agent: {
      type: 'text',
    },
    success: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    timestamp: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes for performance
  pgm.createIndex('blockchain_credentials', 'user_id');
  pgm.createIndex('blockchain_credentials', 'credential_type');
  pgm.createIndex('blockchain_credentials', 'blockchain_tx_id');
  pgm.createIndex('access_grants', 'credential_id');
  pgm.createIndex('access_grants', 'granted_by');
  pgm.createIndex('access_grants', 'access_token');
  pgm.createIndex('access_grants', ['revoked', 'expires_at']);
  pgm.createIndex('access_logs', 'credential_id');
  pgm.createIndex('access_logs', 'timestamp');
  pgm.createIndex('access_logs', 'accessor');

  // Create updated_at trigger for blockchain_credentials
  pgm.createTrigger('blockchain_credentials', 'update_blockchain_credentials_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('access_logs', { cascade: true });
  pgm.dropTable('access_grants', { cascade: true });
  pgm.dropTable('blockchain_credentials', { cascade: true });
};
