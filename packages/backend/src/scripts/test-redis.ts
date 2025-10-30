#!/usr/bin/env tsx

/**
 * Redis Connection Test Script
 * Run this script to verify Redis connection and test basic operations
 */

import { connectRedis, redisClient } from '../config/database';
import { RedisCacheService, RedisKeys, CacheTTL } from '../config/redis-config';

async function testRedis() {
  try {
    console.log('Testing Redis connection...');

    // Connect to Redis
    await connectRedis();

    // Test basic operations
    console.log('\n1. Testing SET/GET operations...');
    const testKey = 'test:connection';
    const testValue = { message: 'Hello Redis!', timestamp: new Date().toISOString() };
    
    await RedisCacheService.set(testKey, testValue, CacheTTL.SHORT);
    const retrieved = await RedisCacheService.get(testKey);
    console.log('✓ SET/GET successful:', retrieved);

    // Test key existence
    console.log('\n2. Testing key existence...');
    const exists = await RedisCacheService.exists(testKey);
    console.log('✓ Key exists:', exists);

    // Test TTL
    console.log('\n3. Testing TTL...');
    const ttl = await RedisCacheService.ttl(testKey);
    console.log('✓ TTL remaining:', ttl, 'seconds');

    // Test increment
    console.log('\n4. Testing increment...');
    const counterKey = 'test:counter';
    await RedisCacheService.incr(counterKey);
    await RedisCacheService.incr(counterKey);
    const counter = await redisClient.get(counterKey);
    console.log('✓ Counter value:', counter);

    // Test set operations
    console.log('\n5. Testing set operations...');
    const setKey = 'test:set';
    await RedisCacheService.sadd(setKey, 'item1', 'item2', 'item3');
    const members = await RedisCacheService.smembers(setKey);
    console.log('✓ Set members:', members);

    // Test sorted set operations
    console.log('\n6. Testing sorted set operations...');
    const zsetKey = 'test:zset';
    await RedisCacheService.zadd(zsetKey, 1, 'first');
    await RedisCacheService.zadd(zsetKey, 2, 'second');
    await RedisCacheService.zadd(zsetKey, 3, 'third');
    const range = await RedisCacheService.zrange(zsetKey, 0, -1);
    console.log('✓ Sorted set range:', range);

    // Test key naming conventions
    console.log('\n7. Testing key naming conventions...');
    const userId = 'test-user-123';
    const userKey = RedisKeys.user(userId);
    const profileKey = RedisKeys.userProfile(userId);
    console.log('✓ User key:', userKey);
    console.log('✓ Profile key:', profileKey);

    // Cleanup test keys
    console.log('\n8. Cleaning up test keys...');
    await RedisCacheService.del(testKey);
    await RedisCacheService.del(counterKey);
    await RedisCacheService.del(setKey);
    await RedisCacheService.del(zsetKey);
    console.log('✓ Test keys cleaned up');

    console.log('\n✓ All Redis tests passed successfully!');
  } catch (error) {
    console.error('Redis test failed:', error);
    process.exit(1);
  } finally {
    await redisClient.quit();
    console.log('\nRedis connection closed');
  }
}

// Run the test
testRedis();
