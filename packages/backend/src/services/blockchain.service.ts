import { pgPool } from '../config/database';
import { blockchainClient, keyManagementSystem } from '../config/blockchain.config';
import {
  BlockchainCredential,
  CredentialStorageRequest,
  CredentialVerification,
  AccessGrant,
  AccessGrantRequest,
  AccessLogEntry,
  CredentialAccessResponse,
} from '../types/blockchain.types';
import crypto from 'crypto';

export class BlockchainService {
  /**
   * Store credential on blockchain
   * Encrypts data, generates hash, and stores on blockchain
   */
  async storeCredential(request: CredentialStorageRequest): Promise<BlockchainCredential> {
    const { userId, credentialType, credentialData } = request;

    // Get or generate encryption key for user
    let keyData = keyManagementSystem.getUserKey(userId);
    if (!keyData) {
      keyData = keyManagementSystem.generateUserKey(userId);
    }

    // Serialize credential data
    const dataString = JSON.stringify(credentialData);

    // Encrypt credential data
    const { encrypted, iv, authTag } = blockchainClient.encryptData(dataString, keyData.key);

    // Generate cryptographic hash
    const credentialHash = blockchainClient.generateHash(dataString);

    // Store hash on blockchain
    const transaction = await blockchainClient.storeHash(credentialHash, {
      userId,
      credentialType,
      issuer: credentialData.issuer,
      timestamp: new Date(),
    });

    // Store credential metadata in database
    const result = await pgPool.query(
      `INSERT INTO blockchain_credentials (
        user_id, credential_type, credential_hash, encrypted_data,
        encryption_iv, encryption_auth_tag, blockchain_tx_id, block_number,
        issuer, expiry_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        credentialType,
        credentialHash,
        encrypted,
        iv,
        authTag,
        transaction.txId,
        transaction.blockNumber,
        credentialData.issuer,
        credentialData.expiryDate || null,
        JSON.stringify({
          title: credentialData.title,
          issueDate: credentialData.issueDate,
        }),
      ]
    );

    const credential = this.mapRowToCredential(result.rows[0]);

    // Log the storage action
    await this.logAccess({
      credentialId: credential.id,
      action: 'granted',
      accessor: userId,
      success: true,
      metadata: { action: 'credential_stored' },
    });

    return credential;
  }

  /**
   * Retrieve credential by ID
   */
  async getCredential(credentialId: string, userId: string): Promise<BlockchainCredential | null> {
    const result = await pgPool.query(
      'SELECT * FROM blockchain_credentials WHERE id = $1 AND user_id = $2',
      [credentialId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCredential(result.rows[0]);
  }

  /**
   * Get all credentials for a user
   */
  async getUserCredentials(userId: string): Promise<BlockchainCredential[]> {
    const result = await pgPool.query(
      'SELECT * FROM blockchain_credentials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(row => this.mapRowToCredential(row));
  }

  /**
   * Decrypt credential data
   */
  async decryptCredentialData(credential: BlockchainCredential): Promise<any> {
    const keyData = keyManagementSystem.getUserKey(credential.userId);
    
    if (!keyData) {
      throw new Error('Encryption key not found for user');
    }

    const decrypted = blockchainClient.decryptData(
      credential.encryptedData,
      keyData.key,
      credential.encryptionIv,
      credential.encryptionAuthTag
    );

    return JSON.parse(decrypted);
  }

  /**
   * Delete credential (GDPR compliance)
   * Note: Blockchain hash remains immutable, but access is revoked
   */
  async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
    // Revoke all access grants
    await pgPool.query(
      `UPDATE access_grants 
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP 
       WHERE credential_id = $1`,
      [credentialId]
    );

    // Delete credential metadata
    const result = await pgPool.query(
      'DELETE FROM blockchain_credentials WHERE id = $1 AND user_id = $2',
      [credentialId, userId]
    );

    // Log deletion
    await this.logAccess({
      credentialId,
      action: 'revoked',
      accessor: userId,
      success: true,
      metadata: { action: 'credential_deleted' },
    });

    return result.rowCount > 0;
  }

  /**
   * Map database row to BlockchainCredential
   */
  private mapRowToCredential(row: any): BlockchainCredential {
    return {
      id: row.id,
      userId: row.user_id,
      credentialType: row.credential_type,
      credentialHash: row.credential_hash,
      encryptedData: row.encrypted_data,
      encryptionIv: row.encryption_iv,
      encryptionAuthTag: row.encryption_auth_tag,
      blockchainTxId: row.blockchain_tx_id,
      blockNumber: row.block_number,
      timestamp: row.created_at,
      issuer: row.issuer,
      expiryDate: row.expiry_date,
      metadata: row.metadata,
    };
  }

  /**
   * Map database row to AccessGrant
   */
  private mapRowToAccessGrant(row: any): AccessGrant {
    return {
      id: row.id,
      credentialId: row.credential_id,
      grantedTo: row.granted_to,
      grantedBy: row.granted_by,
      accessToken: row.access_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      revoked: row.revoked,
      revokedAt: row.revoked_at,
    };
  }

  /**
   * Verify credential authenticity
   * Retrieves hash from blockchain and verifies integrity
   */
  async verifyCredential(credentialId: string, accessToken?: string): Promise<CredentialVerification> {
    // Get credential from database
    const result = await pgPool.query(
      'SELECT * FROM blockchain_credentials WHERE id = $1',
      [credentialId]
    );

    if (result.rows.length === 0) {
      throw new Error('Credential not found');
    }

    const credential = this.mapRowToCredential(result.rows[0]);

    // Retrieve transaction from blockchain
    const transaction = await blockchainClient.getTransaction(credential.blockchainTxId);

    if (!transaction) {
      await this.logAccess({
        credentialId,
        action: 'verification_completed',
        accessor: 'system',
        success: false,
        metadata: { error: 'Transaction not found on blockchain' },
      });

      return {
        credentialId,
        isValid: false,
        issuer: credential.issuer,
        issuedDate: credential.timestamp,
        expiryDate: credential.expiryDate,
        verifiedAt: new Date(),
        blockchainProof: {
          txId: credential.blockchainTxId,
          blockNumber: credential.blockNumber,
          hashMatch: false,
          status: 'failed',
        },
      };
    }

    // Verify hash integrity
    const hashMatch = await blockchainClient.verifyHash(
      credential.blockchainTxId,
      credential.credentialHash
    );

    // Check expiry
    const isExpired = credential.expiryDate && new Date() > new Date(credential.expiryDate);
    const isValid = hashMatch && !isExpired && transaction.status === 'confirmed';

    // Log verification attempt
    await this.logAccess({
      credentialId,
      action: 'verification_completed',
      accessor: accessToken || 'system',
      success: isValid,
      metadata: {
        hashMatch,
        isExpired,
        transactionStatus: transaction.status,
      },
    });

    return {
      credentialId,
      isValid,
      issuer: credential.issuer,
      issuedDate: credential.timestamp,
      expiryDate: credential.expiryDate,
      verifiedAt: new Date(),
      blockchainProof: {
        txId: credential.blockchainTxId,
        blockNumber: credential.blockNumber,
        hashMatch,
        status: transaction.status,
      },
    };
  }

  /**
   * Grant time-limited access to credential
   */
  async grantAccess(request: AccessGrantRequest, userId: string): Promise<AccessGrant> {
    const { credentialId, grantedTo, expiresInDays, purpose } = request;

    // Verify credential belongs to user
    const credential = await this.getCredential(credentialId, userId);
    if (!credential) {
      throw new Error('Credential not found or access denied');
    }

    // Generate unique access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create access grant
    const result = await pgPool.query(
      `INSERT INTO access_grants (
        credential_id, granted_to, granted_by, access_token, 
        expires_at, purpose
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [credentialId, grantedTo, userId, accessToken, expiresAt, purpose || null]
    );

    const grant = this.mapRowToAccessGrant(result.rows[0]);

    // Log access grant
    await this.logAccess({
      credentialId,
      grantId: grant.id,
      action: 'granted',
      accessor: grantedTo,
      success: true,
      metadata: { expiresAt, purpose },
    });

    return grant;
  }

  /**
   * Get all access grants for a credential
   */
  async getCredentialGrants(credentialId: string, userId: string): Promise<AccessGrant[]> {
    // Verify credential belongs to user
    const credential = await this.getCredential(credentialId, userId);
    if (!credential) {
      throw new Error('Credential not found or access denied');
    }

    const result = await pgPool.query(
      'SELECT * FROM access_grants WHERE credential_id = $1 ORDER BY created_at DESC',
      [credentialId]
    );

    return result.rows.map(row => this.mapRowToAccessGrant(row));
  }

  /**
   * Get all grants created by a user
   */
  async getUserGrants(userId: string): Promise<AccessGrant[]> {
    const result = await pgPool.query(
      `SELECT ag.* FROM access_grants ag
       JOIN blockchain_credentials bc ON ag.credential_id = bc.id
       WHERE bc.user_id = $1
       ORDER BY ag.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRowToAccessGrant(row));
  }

  /**
   * Check if access grant is valid
   */
  async isAccessGrantValid(accessToken: string): Promise<boolean> {
    const result = await pgPool.query(
      `SELECT * FROM access_grants 
       WHERE access_token = $1 
       AND revoked = false 
       AND expires_at > CURRENT_TIMESTAMP`,
      [accessToken]
    );

    return result.rows.length > 0;
  }

  /**
   * Revoke access grant by ID
   */
  async revokeAccessGrant(grantId: string, userId: string): Promise<boolean> {
    // Verify grant belongs to user's credential
    const result = await pgPool.query(
      `SELECT ag.*, bc.user_id 
       FROM access_grants ag
       JOIN blockchain_credentials bc ON ag.credential_id = bc.id
       WHERE ag.id = $1`,
      [grantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Access grant not found');
    }

    const grant = result.rows[0];

    if (grant.user_id !== userId) {
      throw new Error('Access denied');
    }

    // Revoke the grant
    const updateResult = await pgPool.query(
      `UPDATE access_grants 
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [grantId]
    );

    // Log revocation
    await this.logAccess({
      credentialId: grant.credential_id,
      grantId,
      action: 'revoked',
      accessor: userId,
      success: true,
      metadata: { grantedTo: grant.granted_to },
    });

    return updateResult.rowCount > 0;
  }

  /**
   * Revoke access grant by access token
   */
  async revokeAccessByToken(accessToken: string, userId: string): Promise<boolean> {
    // Get grant and verify ownership
    const result = await pgPool.query(
      `SELECT ag.*, bc.user_id 
       FROM access_grants ag
       JOIN blockchain_credentials bc ON ag.credential_id = bc.id
       WHERE ag.access_token = $1`,
      [accessToken]
    );

    if (result.rows.length === 0) {
      throw new Error('Access grant not found');
    }

    const grant = result.rows[0];

    if (grant.user_id !== userId) {
      throw new Error('Access denied');
    }

    // Revoke the grant
    const updateResult = await pgPool.query(
      `UPDATE access_grants 
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP 
       WHERE access_token = $1`,
      [accessToken]
    );

    // Log revocation
    await this.logAccess({
      credentialId: grant.credential_id,
      grantId: grant.id,
      action: 'revoked',
      accessor: userId,
      success: true,
      metadata: { grantedTo: grant.granted_to },
    });

    return updateResult.rowCount > 0;
  }

  /**
   * Revoke all access grants for a credential
   */
  async revokeAllCredentialAccess(credentialId: string, userId: string): Promise<number> {
    // Verify credential belongs to user
    const credential = await this.getCredential(credentialId, userId);
    if (!credential) {
      throw new Error('Credential not found or access denied');
    }

    // Revoke all grants
    const result = await pgPool.query(
      `UPDATE access_grants 
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP 
       WHERE credential_id = $1 AND revoked = false`,
      [credentialId]
    );

    // Log revocation
    await this.logAccess({
      credentialId,
      action: 'revoked',
      accessor: userId,
      success: true,
      metadata: { action: 'revoke_all', count: result.rowCount },
    });

    return result.rowCount;
  }

  /**
   * Revoke all expired grants (cleanup job)
   */
  async revokeExpiredGrants(): Promise<number> {
    const result = await pgPool.query(
      `UPDATE access_grants 
       SET revoked = true, revoked_at = CURRENT_TIMESTAMP 
       WHERE expires_at < CURRENT_TIMESTAMP AND revoked = false`
    );

    return result.rowCount;
  }

  /**
   * Get access logs for a credential
   */
  async getCredentialAccessLogs(
    credentialId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AccessLogEntry[]; total: number }> {
    // Verify credential belongs to user
    const credential = await this.getCredential(credentialId, userId);
    if (!credential) {
      throw new Error('Credential not found or access denied');
    }

    let query = 'SELECT * FROM access_logs WHERE credential_id = $1';
    const params: any[] = [credentialId];
    let paramIndex = 2;

    // Add filters
    if (options?.action) {
      query += ` AND action = $${paramIndex}`;
      params.push(options.action);
      paramIndex++;
    }

    if (options?.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await pgPool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await pgPool.query(query, params);

    const logs = result.rows.map(row => this.mapRowToAccessLog(row));

    return { logs, total };
  }

  /**
   * Get all access logs for user's credentials
   */
  async getUserAccessLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AccessLogEntry[]; total: number }> {
    let query = `
      SELECT al.* FROM access_logs al
      JOIN blockchain_credentials bc ON al.credential_id = bc.id
      WHERE bc.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    // Add filters
    if (options?.action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(options.action);
      paramIndex++;
    }

    if (options?.startDate) {
      query += ` AND al.timestamp >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      query += ` AND al.timestamp <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await pgPool.query(
      query.replace('SELECT al.*', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ' ORDER BY al.timestamp DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await pgPool.query(query, params);

    const logs = result.rows.map(row => this.mapRowToAccessLog(row));

    return { logs, total };
  }

  /**
   * Get access statistics for a credential
   */
  async getCredentialAccessStats(credentialId: string, userId: string): Promise<{
    totalAccesses: number;
    successfulAccesses: number;
    failedAccesses: number;
    uniqueAccessors: number;
    lastAccessed?: Date;
    accessesByAction: Record<string, number>;
  }> {
    // Verify credential belongs to user
    const credential = await this.getCredential(credentialId, userId);
    if (!credential) {
      throw new Error('Credential not found or access denied');
    }

    // Get statistics
    const statsResult = await pgPool.query(
      `SELECT 
        COUNT(*) as total_accesses,
        COUNT(*) FILTER (WHERE success = true) as successful_accesses,
        COUNT(*) FILTER (WHERE success = false) as failed_accesses,
        COUNT(DISTINCT accessor) as unique_accessors,
        MAX(timestamp) as last_accessed
       FROM access_logs
       WHERE credential_id = $1`,
      [credentialId]
    );

    const actionStatsResult = await pgPool.query(
      `SELECT action, COUNT(*) as count
       FROM access_logs
       WHERE credential_id = $1
       GROUP BY action`,
      [credentialId]
    );

    const accessesByAction: Record<string, number> = {};
    actionStatsResult.rows.forEach(row => {
      accessesByAction[row.action] = parseInt(row.count);
    });

    const stats = statsResult.rows[0];

    return {
      totalAccesses: parseInt(stats.total_accesses),
      successfulAccesses: parseInt(stats.successful_accesses),
      failedAccesses: parseInt(stats.failed_accesses),
      uniqueAccessors: parseInt(stats.unique_accessors),
      lastAccessed: stats.last_accessed,
      accessesByAction,
    };
  }

  /**
   * Map database row to AccessLogEntry
   */
  private mapRowToAccessLog(row: any): AccessLogEntry {
    return {
      id: row.id,
      credentialId: row.credential_id,
      grantId: row.grant_id,
      timestamp: row.timestamp,
      action: row.action,
      accessor: row.accessor,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      success: row.success,
      metadata: row.metadata,
    };
  }

  /**
   * Verify credential and return data if access is granted
   */
  async verifyAndAccessCredential(
    credentialId: string,
    accessToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CredentialAccessResponse> {
    // Verify access token
    const grantResult = await pgPool.query(
      `SELECT * FROM access_grants 
       WHERE credential_id = $1 AND access_token = $2 
       AND revoked = false AND expires_at > CURRENT_TIMESTAMP`,
      [credentialId, accessToken]
    );

    if (grantResult.rows.length === 0) {
      await this.logAccess({
        credentialId,
        action: 'accessed',
        accessor: accessToken,
        ipAddress,
        userAgent,
        success: false,
        metadata: { error: 'Invalid or expired access token' },
      });

      throw new Error('Invalid or expired access token');
    }

    const grant = grantResult.rows[0];

    // Get credential
    const credential = await this.getCredential(credentialId, grant.granted_by);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Verify on blockchain
    const verification = await this.verifyCredential(credentialId, accessToken);

    if (!verification.isValid) {
      await this.logAccess({
        credentialId,
        grantId: grant.id,
        action: 'accessed',
        accessor: grant.granted_to,
        ipAddress,
        userAgent,
        success: false,
        metadata: { error: 'Credential verification failed' },
      });

      throw new Error('Credential verification failed');
    }

    // Decrypt credential data
    const decryptedData = await this.decryptCredentialData(credential);

    // Log successful access
    await this.logAccess({
      credentialId,
      grantId: grant.id,
      action: 'accessed',
      accessor: grant.granted_to,
      ipAddress,
      userAgent,
      success: true,
    });

    return {
      credential: {
        id: credential.id,
        type: credential.credentialType,
        issuer: credential.issuer,
        issueDate: credential.timestamp,
        expiryDate: credential.expiryDate,
        verified: verification.isValid,
      },
      data: decryptedData,
      blockchainProof: verification.blockchainProof,
    };
  }

  /**
   * Log access attempt
   */
  private async logAccess(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>): Promise<void> {
    await pgPool.query(
      `INSERT INTO access_logs (
        credential_id, grant_id, action, accessor, ip_address, 
        user_agent, success, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.credentialId,
        entry.grantId || null,
        entry.action,
        entry.accessor,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.success,
        JSON.stringify(entry.metadata || {}),
      ]
    );
  }
}

export const blockchainService = new BlockchainService();
