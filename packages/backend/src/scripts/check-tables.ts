#!/usr/bin/env tsx

import { pgPool } from '../config/database';

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');

    // Check if blockchain tables exist
    const result = await pgPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('blockchain_credentials', 'access_grants', 'access_logs')
      ORDER BY table_name;
    `);

    console.log('Blockchain-related tables found:');
    if (result.rows.length === 0) {
      console.log('❌ No blockchain tables found');
    } else {
      result.rows.forEach(row => {
        console.log(`✅ ${row.table_name}`);
      });
    }

    // Check migrations table
    const migrationsResult = await pgPool.query(`
      SELECT name FROM pgmigrations 
      WHERE name LIKE '%blockchain%' 
      ORDER BY run_on;
    `);

    console.log('\nBlockchain migrations applied:');
    if (migrationsResult.rows.length === 0) {
      console.log('❌ No blockchain migrations found');
    } else {
      migrationsResult.rows.forEach(row => {
        console.log(`✅ ${row.name}`);
      });
    }

    // List all tables
    const allTablesResult = await pgPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\nAll tables in database:');
    allTablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await pgPool.end();
  }
}

checkTables();