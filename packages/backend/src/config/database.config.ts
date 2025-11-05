/**
 * Database configuration
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  // Parse DATABASE_URL if provided (for production environments like Heroku)
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading slash
      username: url.username,
      password: url.password,
      ssl: process.env.NODE_ENV === 'production',
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000')
      }
    };
  }

  // Use individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'givemejobs',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000')
    }
  };
}

// Validate database configuration
export function validateDatabaseConfig(config: DatabaseConfig): void {
  const required = ['host', 'port', 'database', 'username', 'password'];
  
  for (const field of required) {
    if (!config[field as keyof DatabaseConfig]) {
      throw new Error(`Database configuration missing required field: ${field}`);
    }
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('Database port must be between 1 and 65535');
  }

  if (config.pool.min < 0) {
    throw new Error('Database pool min must be >= 0');
  }

  if (config.pool.max < config.pool.min) {
    throw new Error('Database pool max must be >= min');
  }

  if (config.pool.idleTimeoutMillis < 1000) {
    throw new Error('Database idle timeout must be >= 1000ms');
  }

  if (config.pool.connectionTimeoutMillis < 1000) {
    throw new Error('Database connection timeout must be >= 1000ms');
  }
}