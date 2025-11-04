import { execSync } from 'child_process';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

export async function setup() {
  console.log('🔧 Setting up test environment...');
  
  try {
    // Create test database if it doesn't exist
    const adminPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'givemejobs',
      password: process.env.DB_PASSWORD || 'dev_password',
      database: 'givemejobs_db', // Connect to main database to create test db
    });

    try {
      await adminPool.query('CREATE DATABASE givemejobs_test');
      console.log('✓ Test database created');
    } catch (error: any) {
      if (error.code !== '42P04') { // Database already exists
        console.error('Error creating test database:', error);
      } else {
        console.log('✓ Test database already exists');
      }
    } finally {
      await adminPool.end();
    }

    // Run migrations on test database
    console.log('🔄 Running migrations on test database...');
    execSync('npm run migrate:test', { 
      stdio: 'inherit',
      env: { 
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/givemejobs_test'
      }
    });
    console.log('✓ Migrations completed');

  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
}

export async function teardown() {
  console.log('🧹 Cleaning up test environment...');
  // Cleanup is handled in individual test files
}