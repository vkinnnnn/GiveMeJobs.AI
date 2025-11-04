#!/usr/bin/env tsx

/**
 * Test Connections Script
 * Tests all database and external service connections
 */

import { config } from '../config/config';
import { pgPool } from '../config/database';
import { mongoClient } from '../config/database';
import { redisClient } from '../config/redis-config';
import { pineconeClient } from '../config/pinecone.config';
import { openaiClient } from '../config/openai.config';
import { resendClient } from '../config/resend.config';

interface ConnectionTest {
  name: string;
  test: () => Promise<boolean>;
  required: boolean;
}

const tests: ConnectionTest[] = [
  {
    name: 'PostgreSQL',
    required: true,
    test: async () => {
      try {
        const result = await pgPool.query('SELECT NOW()');
        console.log(`  ✅ PostgreSQL connected - ${result.rows[0].now}`);
        return true;
      } catch (error) {
        console.log(`  ❌ PostgreSQL failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'MongoDB',
    required: true,
    test: async () => {
      try {
        await mongoClient.db().admin().ping();
        console.log(`  ✅ MongoDB connected`);
        return true;
      } catch (error) {
        console.log(`  ❌ MongoDB failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'Redis',
    required: true,
    test: async () => {
      try {
        const pong = await redisClient.ping();
        console.log(`  ✅ Redis connected - ${pong}`);
        return true;
      } catch (error) {
        console.log(`  ❌ Redis failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'Pinecone',
    required: true,
    test: async () => {
      try {
        if (!config.pinecone?.apiKey) {
          console.log(`  ⚠️  Pinecone API key not configured`);
          return false;
        }
        
        const indexes = await pineconeClient.listIndexes();
        console.log(`  ✅ Pinecone connected - ${indexes.length} indexes`);
        return true;
      } catch (error) {
        console.log(`  ❌ Pinecone failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'OpenAI',
    required: true,
    test: async () => {
      try {
        if (!config.openai?.apiKey) {
          console.log(`  ⚠️  OpenAI API key not configured`);
          return false;
        }
        
        const models = await openaiClient.models.list();
        console.log(`  ✅ OpenAI connected - ${models.data.length} models available`);
        return true;
      } catch (error) {
        console.log(`  ❌ OpenAI failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'Resend',
    required: true,
    test: async () => {
      try {
        if (!config.resend?.apiKey) {
          console.log(`  ⚠️  Resend API key not configured`);
          return false;
        }
        
        // Test by getting domains (doesn't send email)
        const domains = await resendClient.domains.list();
        console.log(`  ✅ Resend connected - ${domains.data.length} domains`);
        return true;
      } catch (error) {
        console.log(`  ❌ Resend failed: ${error.message}`);
        return false;
      }
    }
  }
];

async function testConnections(): Promise<void> {
  console.log('🔌 Testing all service connections...\n');
  
  let allPassed = true;
  let requiredPassed = true;
  
  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    const passed = await test.test();
    
    if (!passed) {
      allPassed = false;
      if (test.required) {
        requiredPassed = false;
      }
    }
    console.log('');
  }
  
  console.log('📊 Connection Test Summary:');
  console.log(`  Total tests: ${tests.length}`);
  console.log(`  Passed: ${tests.filter(async (t) => await t.test()).length}`);
  console.log(`  Failed: ${tests.filter(async (t) => !(await t.test())).length}`);
  
  if (requiredPassed) {
    console.log('\n✅ All required connections are working!');
    process.exit(0);
  } else {
    console.log('\n❌ Some required connections failed!');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down connection tests...');
  
  try {
    await pgPool.end();
    await mongoClient.close();
    await redisClient.quit();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  process.exit(0);
});

// Run tests
testConnections().catch((error) => {
  console.error('❌ Connection test failed:', error);
  process.exit(1);
});