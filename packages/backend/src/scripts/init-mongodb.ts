#!/usr/bin/env tsx

/**
 * MongoDB Initialization Script
 * Run this script to set up MongoDB collections, indexes, and seed default templates
 */

import { connectMongo, mongoClient } from '../config/database';
import { initializeMongoCollections, seedDefaultTemplates } from '../config/mongodb-schemas';

async function initMongoDB() {
  try {
    console.log('Starting MongoDB initialization...');

    // Connect to MongoDB
    const db = await connectMongo();

    // Initialize collections and indexes
    await initializeMongoCollections(db);

    // Seed default templates
    await seedDefaultTemplates(db);

    console.log('✓ MongoDB initialization completed successfully');
  } catch (error) {
    console.error('MongoDB initialization failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    console.log('MongoDB connection closed');
  }
}

// Run the initialization
initMongoDB();
