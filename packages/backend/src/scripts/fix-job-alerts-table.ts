#!/usr/bin/env tsx

import { pgPool } from '../config/database';

async function fixJobAlertsTable() {
  try {
    console.log('🔧 Checking and fixing job_alerts table...\n');
    
    // Check current structure
    const result = await pgPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'job_alerts' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current job_alerts table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check if last_triggered column exists
    const hasLastTriggered = result.rows.some(row => row.column_name === 'last_triggered');
    
    if (!hasLastTriggered) {
      console.log('\n🔧 Adding missing last_triggered column...');
      await pgPool.query(`
        ALTER TABLE job_alerts 
        ADD COLUMN IF NOT EXISTS last_triggered timestamp;
      `);
      console.log('✅ Added last_triggered column');
    } else {
      console.log('✅ last_triggered column already exists');
    }
    
    // Test the table
    const testResult = await pgPool.query('SELECT COUNT(*) FROM job_alerts');
    console.log(`✅ Table verified - has ${testResult.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error fixing job_alerts table:', error.message);
  } finally {
    await pgPool.end();
  }
}

fixJobAlertsTable();