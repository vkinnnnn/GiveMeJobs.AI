#!/usr/bin/env tsx

import { pgPool } from '../config/database';

async function createUserProfilesTable() {
  try {
    console.log('🔧 Creating user_profiles table...\n');
    
    // Create user_profiles table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_score decimal(5,2) DEFAULT 0,
        preferences jsonb DEFAULT '{}',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await pgPool.query('CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id)');
    await pgPool.query('CREATE INDEX IF NOT EXISTS user_profiles_skill_score_idx ON user_profiles(skill_score)');
    
    console.log('✅ user_profiles table created successfully!');
    
    // Test the table
    const testResult = await pgPool.query('SELECT COUNT(*) FROM user_profiles');
    console.log(`✅ Table verified - has ${testResult.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error creating user_profiles table:', error.message);
  } finally {
    await pgPool.end();
  }
}

createUserProfilesTable();