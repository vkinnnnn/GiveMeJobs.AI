#!/usr/bin/env tsx

import { pgPool } from '../config/database';

async function createBlockchainTables() {
  try {
    console.log('🔗 Creating blockchain tables...\n');
    
    // Create blockchain_credentials table
    console.log('Creating blockchain_credentials table...');
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS blockchain_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_type varchar(50) NOT NULL CHECK (credential_type IN ('degree', 'certification', 'transcript', 'license')),
        credential_hash varchar(255) NOT NULL,
        encrypted_data text NOT NULL,
        encryption_iv varchar(255) NOT NULL,
        encryption_auth_tag varchar(255) NOT NULL,
        blockchain_tx_id varchar(255) NOT NULL UNIQUE,
        block_number integer NOT NULL,
        issuer varchar(255) NOT NULL,
        expiry_date timestamp,
        metadata jsonb DEFAULT '{}',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create access_grants table
    console.log('Creating access_grants table...');
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS access_grants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        credential_id uuid NOT NULL REFERENCES blockchain_credentials(id) ON DELETE CASCADE,
        granted_to varchar(255) NOT NULL,
        granted_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token varchar(255) NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        revoked boolean NOT NULL DEFAULT false,
        revoked_at timestamp,
        purpose text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create access_logs table
    console.log('Creating access_logs table...');
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        credential_id uuid NOT NULL REFERENCES blockchain_credentials(id) ON DELETE CASCADE,
        grant_id uuid REFERENCES access_grants(id) ON DELETE SET NULL,
        action varchar(50) NOT NULL CHECK (action IN ('granted', 'accessed', 'revoked', 'verification_requested', 'verification_completed')),
        accessor varchar(255) NOT NULL,
        ip_address varchar(45),
        user_agent text,
        success boolean NOT NULL DEFAULT true,
        metadata jsonb DEFAULT '{}',
        timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await pgPool.query('CREATE INDEX IF NOT EXISTS blockchain_credentials_user_id_idx ON blockchain_credentials(user_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS blockchain_credentials_type_idx ON blockchain_credentials(credential_type)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS blockchain_credentials_tx_id_idx ON blockchain_credentials(blockchain_tx_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_grants_credential_id_idx ON access_grants(credential_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_grants_granted_by_idx ON access_grants(granted_by)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_grants_token_idx ON access_grants(access_token)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_grants_revoked_expires_idx ON access_grants(revoked, expires_at)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_logs_credential_id_idx ON access_logs(credential_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_logs_timestamp_idx ON access_logs(timestamp)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS access_logs_accessor_idx ON access_logs(accessor)');
    
    console.log('\n✅ All blockchain tables created successfully!');
    console.log('   - blockchain_credentials');
    console.log('   - access_grants');
    console.log('   - access_logs');
    console.log('   - All indexes created');
    
  } catch (error) {
    console.error('❌ Error creating blockchain tables:', error);
  } finally {
    await pgPool.end();
  }
}

createBlockchainTables();