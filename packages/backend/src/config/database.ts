import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Pool Configuration
export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'givemejobs',
  password: process.env.POSTGRES_PASSWORD || 'dev_password',
  database: process.env.POSTGRES_DB || 'givemejobs_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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

// Graceful shutdown
export const closeConnections = async () => {
  await pgPool.end();
  await mongoClient.close();
  await redisClient.quit();
  console.log('All database connections closed');
};
