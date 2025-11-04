#!/usr/bin/env tsx

import { pgPool } from '../config/database';

async function checkOAuthTable() {
  try {
    console.log('🔍 Checking OAuth accounts table...\n');
    
    // Check table structure
    const result = await pgPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'oauth_accounts' 
      ORDER BY ordinal_position;
    `);
    
    console.log('OAuth accounts table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Test a simple query
    const testResult = await pgPool.query('SELECT COUNT(*) FROM oauth_accounts');
    console.log(`\n✅ Table exists and has ${testResult.rows[0].count} records`);
    
    // Test insert (to verify structure)
    console.log('\n🧪 Testing table structure...');
    try {
      await pgPool.query(`
        INSERT INTO oauth_accounts (user_id, provider, provider_account_id, access_token, refresh_token) 
        VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test', 'test123', 'token', 'refresh') 
        ON CONFLICT DO NOTHING
      `);
      console.log('✅ Table structure is correct for OAuth operations');
      
      // Clean up test record
      await pgPool.query(`DELETE FROM oauth_accounts WHERE provider = 'test'`);
      
    } catch (error) {
      console.error('❌ Table structure issue:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking OAuth table:', error.message);
  } finally {
    await pgPool.end();
  }
}

checkOAuthTable();