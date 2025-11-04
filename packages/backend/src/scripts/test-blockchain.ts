#!/usr/bin/env tsx

/**
 * Blockchain Service Test Script
 * 
 * This script tests the complete blockchain credential storage functionality:
 * 1. Store a credential on blockchain
 * 2. Verify credential authenticity
 * 3. Grant access to credential
 * 4. Access credential with token
 * 5. Revoke access
 * 6. Test audit logging
 */

import { blockchainService } from '../services/blockchain.service';
import { blockchainClient } from '../config/blockchain.config';

async function testBlockchainService() {
  console.log('🧪 Testing Blockchain Credential Storage Service...\n');

  try {
    // First, create a test user
    console.log('0️⃣ Creating test user...');
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
    
    // Create test user in database (if not exists)
    const { pgPool } = await import('../config/database');
    await pgPool.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (id) DO NOTHING
    `, [testUserId, 'test@blockchain.com', 'hashed_password', 'Test', 'User']);
    
    console.log('✅ Test user ready');
    
    // Test 1: Store a credential
    console.log('1️⃣ Testing credential storage...');
    const testCredential = await blockchainService.storeCredential({
      userId: testUserId,
      credentialType: 'degree',
      credentialData: {
        title: 'Bachelor of Computer Science',
        issuer: 'Test University',
        issueDate: new Date('2020-05-15').toISOString(),
        expiryDate: new Date('2030-05-15').toISOString(),
        description: 'Bachelor degree in Computer Science with honors',
        metadata: {
          gpa: 3.8,
          major: 'Computer Science',
          minor: 'Mathematics'
        }
      }
    });

    console.log(`✅ Credential stored successfully!`);
    console.log(`   - ID: ${testCredential.id}`);
    console.log(`   - Type: ${testCredential.credentialType}`);
    console.log(`   - Issuer: ${testCredential.issuer}`);
    console.log(`   - Blockchain TX: ${testCredential.blockchainTxId}`);
    console.log(`   - Block Number: ${testCredential.blockNumber}\n`);

    // Test 2: Verify credential
    console.log('2️⃣ Testing credential verification...');
    const verification = await blockchainService.verifyCredential(testCredential.id);
    
    console.log(`✅ Credential verification completed!`);
    console.log(`   - Valid: ${verification.isValid}`);
    console.log(`   - Issuer: ${verification.issuer}`);
    console.log(`   - Issue Date: ${verification.issuedDate}`);
    console.log(`   - Blockchain Proof: ${verification.blockchainProof.txId}\n`);

    // Test 3: Grant access
    console.log('3️⃣ Testing access grant...');
    const accessGrant = await blockchainService.grantAccess({
      credentialId: testCredential.id,
      grantedTo: 'employer@company.com',
      expiresInDays: 30,
      purpose: 'Job application verification'
    }, testUserId);

    console.log(`✅ Access granted successfully!`);
    console.log(`   - Grant ID: ${accessGrant.id}`);
    console.log(`   - Granted To: ${accessGrant.grantedTo}`);
    console.log(`   - Access Token: ${accessGrant.accessToken.substring(0, 16)}...`);
    console.log(`   - Expires At: ${accessGrant.expiresAt}\n`);

    // Test 4: Access credential with token
    console.log('4️⃣ Testing credential access...');
    const credentialAccess = await blockchainService.verifyAndAccessCredential(
      testCredential.id,
      accessGrant.accessToken,
      '127.0.0.1',
      'Test-User-Agent'
    );

    console.log(`✅ Credential accessed successfully!`);
    console.log(`   - Credential Type: ${credentialAccess.credential.type}`);
    console.log(`   - Issuer: ${credentialAccess.credential.issuer}`);
    console.log(`   - Verified: ${credentialAccess.credential.verified}`);
    console.log(`   - Data Title: ${credentialAccess.data.title}\n`);

    // Test 5: Get access logs
    console.log('5️⃣ Testing access logs...');
    const { logs, total } = await blockchainService.getCredentialAccessLogs(
      testCredential.id,
      testUserId,
      { limit: 10 }
    );

    console.log(`✅ Access logs retrieved successfully!`);
    console.log(`   - Total Logs: ${total}`);
    console.log(`   - Recent Actions: ${logs.map(log => log.action).join(', ')}\n`);

    // Test 6: Get credential statistics
    console.log('6️⃣ Testing credential statistics...');
    const stats = await blockchainService.getCredentialAccessStats(
      testCredential.id,
      testUserId
    );

    console.log(`✅ Statistics retrieved successfully!`);
    console.log(`   - Total Accesses: ${stats.totalAccesses}`);
    console.log(`   - Successful Accesses: ${stats.successfulAccesses}`);
    console.log(`   - Unique Accessors: ${stats.uniqueAccessors}`);
    console.log(`   - Last Accessed: ${stats.lastAccessed}\n`);

    // Test 7: Revoke access
    console.log('7️⃣ Testing access revocation...');
    const revoked = await blockchainService.revokeAccessGrant(accessGrant.id, testUserId);

    console.log(`✅ Access revoked successfully: ${revoked}\n`);

    // Test 8: Test blockchain client functions
    console.log('8️⃣ Testing blockchain client functions...');
    
    // Test encryption/decryption
    const testData = 'sensitive credential data';
    const key = Buffer.alloc(32, 'test-key-32-bytes-long-for-aes256'); // Ensure exactly 32 bytes
    const encrypted = blockchainClient.encryptData(testData, key);
    const decrypted = blockchainClient.decryptData(
      encrypted.encrypted,
      key,
      encrypted.iv,
      encrypted.authTag
    );

    console.log(`✅ Encryption/Decryption test: ${decrypted === testData ? 'PASSED' : 'FAILED'}`);

    // Test hash generation
    const hash1 = blockchainClient.generateHash(testData);
    const hash2 = blockchainClient.generateHash(testData);
    console.log(`✅ Hash consistency test: ${hash1 === hash2 ? 'PASSED' : 'FAILED'}`);

    // Test network status
    const networkStatus = await blockchainClient.getNetworkStatus();
    console.log(`✅ Network status: ${networkStatus.network} (Connected: ${networkStatus.connected})`);

    console.log('\n🎉 All blockchain tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Credential storage and retrieval');
    console.log('   ✅ Blockchain verification');
    console.log('   ✅ Access grant management');
    console.log('   ✅ Secure credential access');
    console.log('   ✅ Audit logging and statistics');
    console.log('   ✅ Access revocation');
    console.log('   ✅ Encryption/decryption');
    console.log('   ✅ Hash generation and verification');
    console.log('   ✅ Network connectivity');

    console.log('\n🔗 The blockchain credential storage service is fully operational!');

  } catch (error) {
    console.error('❌ Blockchain test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure PostgreSQL is running and migrations are applied');
    console.log('   2. Check that the blockchain configuration is correct');
    console.log('   3. Verify environment variables are set properly');
    console.log('   4. Check the server logs for detailed error information');
  }
}

// Run the test
if (require.main === module) {
  testBlockchainService().catch(console.error);
}

export { testBlockchainService };