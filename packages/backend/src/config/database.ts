import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Enhanced PostgreSQL Pool Configuration
export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'givemejobs',
  password: process.env.POSTGRES_PASSWORD || 'dev_password',
  database: process.env.POSTGRES_DB || 'givemejobs_db',
  
  // Connection pool optimization
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'), // Maximum number of clients in the pool
  min: parseInt(process.env.POSTGRES_MIN_CONNECTIONS || '2'),  // Minimum number of clients in the pool
  
  // Timeout configurations
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '5000'), // 5 seconds
  acquireTimeoutMillis: parseInt(process.env.POSTGRES_ACQUIRE_TIMEOUT || '60000'), // 60 seconds
  
  // Query timeout
  query_timeout: parseInt(process.env.POSTGRES_QUERY_TIMEOUT || '30000'), // 30 seconds
  
  // Statement timeout
  statement_timeout: parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT || '30000'), // 30 seconds
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Application name for monitoring
  application_name: 'givemejobs-backend',
  
  // Enable prepared statements
  allowExitOnIdle: true,
});

// Test PostgreSQL connection
pgPool.on('connect', () => {
  console.log('✓ PostgreSQL connected');
});

pgPool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

// MongoDB Client Configuration
const mongoUri = process.env.MONGODB_URI || 'mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin';
export const mongoClient = new MongoClient(mongoUri);

export const connectMongo = async () => {
  try {
    await mongoClient.connect();
    console.log('✓ MongoDB connected');
    return mongoClient.db(process.env.MONGO_DB || 'givemejobs_docs');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Redis Client Configuration
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://:dev_password@localhost:6379',
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
};

// Legacy exports for backward compatibility
export const pool = pgPool;
export default pgPool;

// Graceful shutdown
export const closeConnections = async () => {
  await pgPool.end();
  await mongoClient.close();
  await redisClient.quit();
  console.log('All database connections closed');
};
