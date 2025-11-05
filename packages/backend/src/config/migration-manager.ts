import { Pool, PoolClient } from 'pg';
import { pgPool } from './database';
import logger from '../services/logger.service';
import fs from 'fs/promises';
import path from 'path';

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  timestamp: Date;
}

export class MigrationManager {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool = pgPool, migrationsPath: string = path.join(__dirname, '../migrations')) {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INTEGER,
          checksum VARCHAR(64)
        )
      `);
      
      // Create index for faster lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_migration_id 
        ON schema_migrations(migration_id)
      `);
      
      logger.info('Migration table initialized');
    } catch (error) {
      logger.error('Failed to initialize migration table', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all available migration files
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      const migrations: Migration[] = [];

      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Parse migration file (expecting -- UP and -- DOWN sections)
        const upMatch = content.match(/-- UP\s*\n([\s\S]*?)(?=-- DOWN|$)/i);
        const downMatch = content.match(/-- DOWN\s*\n([\s\S]*?)$/i);
        
        if (!upMatch) {
          logger.warn(`Migration file ${file} missing UP section`);
          continue;
        }

        const migrationId = file.replace('.sql', '');
        const name = migrationId.replace(/^\d+_/, '').replace(/_/g, ' ');
        
        migrations.push({
          id: migrationId,
          name,
          up: upMatch[1].trim(),
          down: downMatch ? downMatch[1].trim() : '',
          timestamp: new Date(),
        });
      }

      return migrations;
    } catch (error) {
      logger.error('Failed to read migration files', { error });
      throw error;
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT migration_id FROM schema_migrations ORDER BY executed_at'
      );
      return result.rows.map(row => row.migration_id);
    } catch (error) {
      logger.error('Failed to get executed migrations', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    await this.initializeMigrationTable();
    
    const availableMigrations = await this.getAvailableMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    const pendingMigrations = availableMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    logger.info('All migrations completed successfully');
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      await client.query('BEGIN');
      
      logger.info(`Executing migration: ${migration.name}`);
      
      // Execute the migration SQL
      await client.query(migration.up);
      
      // Record the migration
      const executionTime = Date.now() - startTime;
      const checksum = this.calculateChecksum(migration.up);
      
      await client.query(
        `INSERT INTO schema_migrations (migration_id, name, execution_time_ms, checksum)
         VALUES ($1, $2, $3, $4)`,
        [migration.id, migration.name, executionTime, checksum]
      );
      
      await client.query('COMMIT');
      
      logger.info(`Migration completed: ${migration.name} (${executionTime}ms)`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration failed: ${migration.name}`, { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get the last executed migration
      const result = await client.query(
        `SELECT migration_id FROM schema_migrations 
         ORDER BY executed_at DESC LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }
      
      const migrationId = result.rows[0].migration_id;
      const availableMigrations = await this.getAvailableMigrations();
      const migration = availableMigrations.find(m => m.id === migrationId);
      
      if (!migration) {
        throw new Error(`Migration file not found for ${migrationId}`);
      }
      
      if (!migration.down) {
        throw new Error(`No rollback script found for migration ${migrationId}`);
      }
      
      await client.query('BEGIN');
      
      logger.info(`Rolling back migration: ${migration.name}`);
      
      // Execute the rollback SQL
      await client.query(migration.down);
      
      // Remove the migration record
      await client.query(
        'DELETE FROM schema_migrations WHERE migration_id = $1',
        [migrationId]
      );
      
      await client.query('COMMIT');
      
      logger.info(`Migration rolled back: ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Migration rollback failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    migrations: Array<{
      id: string;
      name: string;
      status: 'executed' | 'pending';
      executedAt?: Date;
    }>;
  }> {
    const availableMigrations = await this.getAvailableMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    const client = await this.pool.connect();
    let executionDetails: Record<string, Date> = {};
    
    try {
      const result = await client.query(
        'SELECT migration_id, executed_at FROM schema_migrations'
      );
      executionDetails = result.rows.reduce((acc, row) => {
        acc[row.migration_id] = row.executed_at;
        return acc;
      }, {});
    } finally {
      client.release();
    }
    
    const migrations = availableMigrations.map(migration => ({
      id: migration.id,
      name: migration.name,
      status: executedMigrations.includes(migration.id) ? 'executed' as const : 'pending' as const,
      executedAt: executionDetails[migration.id],
    }));
    
    return {
      total: availableMigrations.length,
      executed: executedMigrations.length,
      pending: availableMigrations.length - executedMigrations.length,
      migrations,
    };
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();