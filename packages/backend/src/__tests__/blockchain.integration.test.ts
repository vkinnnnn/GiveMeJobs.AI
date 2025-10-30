import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { blockchainService } from '../services/blockchain.service';
import { blockchainClient, keyManagementSystem } from '../config/blockchain.config';
import { pgPool } from '../config/database';
import { CredentialStorageRequest } from '../types/blockchain.types';

describe('Blockchain Service Integration Tests', () => {
  const testUserId = 'test-user-' + Date.now();
  let credentialId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Ensure test user has encryption key
    keyManagementSystem.generateUserKey(testUserId);
  });

  afterAll(async () => {
    // Cleanup test data
    if (credentialId) {
      await pgPool.query('DELETE FROM blockchain_credentials WHERE id = $1', [credentialId]);
    }
    keyManagementSystem.deleteUserKey(testUserId);
  });

  describe('Credential Storage', () => {
    it('should store a credential on blockchain', async () => {
      const request: CredentialStorageRequest = {
        userId: testUserId,
        credentialType: 'degree',
        credentialData: {
          title: 'Bachelor of Science in Computer Science',
          issuer: 'Test University',
          issueDate: new Date('2020-05-15'),
          details: {
            gpa: 3.8,
            honors: 'Magna Cum Laude',
          },
        },
      };

      const credential = await blockchainService.storeCredential(request);

      expect(credential).toBeDefined();
      expect(credential.id).toBeDefined();
      expect(credential.userId).toBe(testUserId);
      expect(credential.credentialType).toBe('degree');
      expect(credential.issuer).toBe('Test University');
      expect(credential.blockchainTxId).toBeDefined();
      expect(credential.blockNumber).toBeGreaterThan(0);

      credentialId = credential.id;
    });

    it('should retrieve stored credential', async () => {
      const credential = await blockchainService.getCredential(credentialId, testUserId);

      expect(credential).toBeDefined();
      expect(credential?.id).toBe(credentialId);
      expect(credential?.credentialType).toBe('degree');
    });

    it('should decrypt credential data', async () => {
      const credential = await blockchainService.getCredential(credentialId, testUserId);
      expect(credential).toBeDefined();

      const decryptedData = await blockchainService.decryptCredentialData(credential!);

      expect(decryptedData).toBeDefined();
      expect(decryptedData.title).toBe('Bachelor of Science in Computer Science');
      expect(decryptedData.issuer).toBe('Test University');
      expect(decryptedData.details.gpa).toBe(3.8);
    });

    it('should get all user credentials', async () => {
      const credentials = await blockchainService.getUserCredentials(testUserId);

      expect(credentials).toBeDefined();
      expect(credentials.length).toBeGreaterThan(0);
      expect(credentials[0].userId).toBe(testUserId);
    });
  });

  describe('Credential Verification', () => {
    it('should verify credential on blockchain', async () => {
      const verification = await blockchainService.verifyCredential(credentialId);

      expect(verification).toBeDefined();
      expect(verification.credentialId).toBe(credentialId);
      expect(verification.isValid).toBe(true);
      expect(verification.blockchainProof.hashMatch).toBe(true);
      expect(verification.blockchainProof.status).toBe('confirmed');
    });

    it('should detect invalid credential', async () => {
      const fakeCredentialId = 'fake-credential-id';
      
      await expect(
        blockchainService.verifyCredential(fakeCredentialId)
      ).rejects.toThrow();
    });
  });

  describe('Access Grant Management', () => {
    it('should grant access to credential', async () => {
      const grant = await blockchainService.grantAccess(
        {
          credentialId,
          grantedTo: 'employer@company.com',
          expiresInDays: 30,
          purpose: 'Job application verification',
        },
        testUserId
      );

      expect(grant).toBeDefined();
      expect(grant.id).toBeDefined();
      expect(grant.credentialId).toBe(credentialId);
      expect(grant.grantedTo).toBe('employer@company.com');
      expect(grant.accessToken).toBeDefined();
      expect(grant.revoked).toBe(false);

      accessToken = grant.accessToken;
    });

    it('should validate access token', async () => {
      const isValid = await blockchainService.isAccessGrantValid(accessToken);
      expect(isValid).toBe(true);
    });

    it('should get credential grants', async () => {
      const grants = await blockchainService.getCredentialGrants(credentialId, testUserId);

      expect(grants).toBeDefined();
      expect(grants.length).toBeGreaterThan(0);
      expect(grants[0].credentialId).toBe(credentialId);
    });

    it('should access credential with valid token', async () => {
      const credentialData = await blockchainService.verifyAndAccessCredential(
        credentialId,
        accessToken,
        '127.0.0.1',
        'test-agent'
      );

      expect(credentialData).toBeDefined();
      expect(credentialData.credential.id).toBe(credentialId);
      expect(credentialData.credential.verified).toBe(true);
      expect(credentialData.data).toBeDefined();
      expect(credentialData.data.title).toBe('Bachelor of Science in Computer Science');
    });
  });

  describe('Access Revocation', () => {
    it('should revoke access grant', async () => {
      const revoked = await blockchainService.revokeAccessByToken(accessToken, testUserId);
      expect(revoked).toBe(true);
    });

    it('should reject access with revoked token', async () => {
      await expect(
        blockchainService.verifyAndAccessCredential(
          credentialId,
          accessToken,
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Invalid or expired access token');
    });

    it('should revoke all credential access', async () => {
      // Create multiple grants
      await blockchainService.grantAccess(
        {
          credentialId,
          grantedTo: 'employer1@company.com',
          expiresInDays: 30,
        },
        testUserId
      );

      await blockchainService.grantAccess(
        {
          credentialId,
          grantedTo: 'employer2@company.com',
          expiresInDays: 30,
        },
        testUserId
      );

      const revokedCount = await blockchainService.revokeAllCredentialAccess(
        credentialId,
        testUserId
      );

      expect(revokedCount).toBeGreaterThan(0);
    });
  });

  describe('Access Audit Logs', () => {
    it('should retrieve access logs', async () => {
      const { logs, total } = await blockchainService.getCredentialAccessLogs(
        credentialId,
        testUserId,
        { limit: 10 }
      );

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      expect(total).toBeGreaterThan(0);
    });

    it('should filter access logs by action', async () => {
      const { logs } = await blockchainService.getCredentialAccessLogs(
        credentialId,
        testUserId,
        { action: 'granted', limit: 10 }
      );

      expect(logs).toBeDefined();
      logs.forEach(log => {
        expect(log.action).toBe('granted');
      });
    });

    it('should get access statistics', async () => {
      const stats = await blockchainService.getCredentialAccessStats(credentialId, testUserId);

      expect(stats).toBeDefined();
      expect(stats.totalAccesses).toBeGreaterThan(0);
      expect(stats.successfulAccesses).toBeGreaterThan(0);
      expect(stats.accessesByAction).toBeDefined();
    });

    it('should get user access logs', async () => {
      const { logs, total } = await blockchainService.getUserAccessLogs(testUserId, {
        limit: 10,
      });

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('Blockchain Client', () => {
    it('should generate key pair', () => {
      const keyPair = blockchainClient.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
    });

    it('should encrypt and decrypt data', () => {
      const key = Buffer.from('0'.repeat(64), 'hex');
      const data = 'sensitive credential data';

      const { encrypted, iv, authTag } = blockchainClient.encryptData(data, key);

      expect(encrypted).toBeDefined();
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();

      const decrypted = blockchainClient.decryptData(encrypted, key, iv, authTag);
      expect(decrypted).toBe(data);
    });

    it('should generate consistent hash', () => {
      const data = 'test data';
      const hash1 = blockchainClient.generateHash(data);
      const hash2 = blockchainClient.generateHash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should get blockchain network status', async () => {
      const status = await blockchainClient.getNetworkStatus();

      expect(status).toBeDefined();
      expect(status.connected).toBe(true);
      expect(status.blockHeight).toBeGreaterThanOrEqual(0);
      expect(status.network).toBeDefined();
    });
  });

  describe('Credential Deletion (GDPR)', () => {
    it('should delete credential and revoke all access', async () => {
      const deleted = await blockchainService.deleteCredential(credentialId, testUserId);
      expect(deleted).toBe(true);

      // Verify credential is deleted
      const credential = await blockchainService.getCredential(credentialId, testUserId);
      expect(credential).toBeNull();
    });
  });
});
