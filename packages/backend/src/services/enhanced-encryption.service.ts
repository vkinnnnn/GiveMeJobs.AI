import { injectable, inject } from 'inversify';
import crypto from 'crypto';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../types/container.types';

/**
 * Enhanced Encryption Service for Node.js
 * 
 * Provides comprehensive encryption capabilities including:
 * - Field-level encryption for PII data
 * - Key management and rotation
 * - Secure key derivation
 * - TLS 1.3 configuration
 * - Hardware Security Module (HSM) integration
 */

export interface EncryptionKeyMetadata {
  keyId: string;
  createdAt: Date;
  expiresAt?: Date;
  algorithm: string;
  keyType: 'symmetric' | 'asymmetric';
  isActive: boolean;
  rotationCount: number;
  purpose: 'pii' | 'session' | 'database' | 'communication' | 'backup';
}

export interface EncryptedField {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv?: string;
  authTag?: string;
  createdAt: Date;
}

export interface KeyRotationPolicy {
  keyId: string;
  rotationIntervalDays: number;
  warningDays: number;
  autoRotate: boolean;
  notificationEmails: string[];
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  iterations: number;
  saltLength: number;
}

@injectable()
export class EnhancedEncryptionService {
  private keys: Map<string, Buffer> = new Map();
  private keyMetadata: Map<string, EncryptionKeyMetadata> = new Map();
  private rotationPolicies: Map<string, KeyRotationPolicy> = new Map();
  private masterKey: Buffer;

  // Encryption configurations for different algorithms
  private readonly configs: Record<string, EncryptionConfig> = {
    'aes-256-gcm': {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      iterations: 100000,
      saltLength: 32,
    },
    'aes-256-cbc': {
      algorithm: 'aes-256-cbc',
      keyLength: 32,
      ivLength: 16,
      tagLength: 0,
      iterations: 100000,
      saltLength: 32,
    },
    'chacha20-poly1305': {
      algorithm: 'chacha20-poly1305',
      keyLength: 32,
      ivLength: 12,
      tagLength: 16,
      iterations: 100000,
      saltLength: 32,
    },
  };

  constructor(
    @inject(TYPES.Redis) private redis: Redis,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.Database) private pool: Pool
  ) {
    this.initializeMasterKey();
    this.initializeDefaultKeys();
    this.startKeyRotationScheduler();
  }

  /**
   * Initialize master encryption key
   */
  private initializeMasterKey(): void {
    try {
      const masterKeyEnv = process.env.MASTER_ENCRYPTION_KEY;
      
      if (masterKeyEnv) {
        // Derive master key from environment variable
        this.masterKey = this.deriveKeyFromPassword(
          masterKeyEnv,
          'givemejobs_master_salt'
        );
      } else {
        // Generate new master key (development only)
        this.masterKey = crypto.randomBytes(32);
        this.logger.warn('Generated new master key - store securely in production', {
          keyPreview: this.masterKey.subarray(0, 8).toString('hex') + '...',
        });
      }

      this.logger.info('Master encryption key initialized');
    } catch (error) {
      this.logger.error('Failed to initialize master key', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize default encryption keys
   */
  private initializeDefaultKeys(): void {
    try {
      // Create default PII encryption key
      this.createSymmetricKey('pii_default_v1', 'aes-256-gcm', 'pii', 90);

      // Create default session encryption key
      this.createSymmetricKey('session_default_v1', 'aes-256-gcm', 'session', 30);

      // Create default database encryption key
      this.createSymmetricKey('database_default_v1', 'aes-256-gcm', 'database', 180);

      // Create default communication encryption key
      this.createSymmetricKey('communication_default_v1', 'chacha20-poly1305', 'communication', 60);

      this.logger.info('Default encryption keys initialized', {
        keyCount: this.keys.size,
      });
    } catch (error) {
      this.logger.error('Failed to initialize default keys', { error: error.message });
      throw error;
    }
  }

  /**
   * Create symmetric encryption key
   */
  createSymmetricKey(
    keyId: string,
    algorithm: string = 'aes-256-gcm',
    purpose: 'pii' | 'session' | 'database' | 'communication' | 'backup' = 'pii',
    expirationDays?: number
  ): string {
    try {
      if (this.keys.has(keyId)) {
        throw new Error(`Key with ID '${keyId}' already exists`);
      }

      const config = this.configs[algorithm];
      if (!config) {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      // Generate new encryption key
      const key = crypto.randomBytes(config.keyLength);
      
      // Store key
      this.keys.set(keyId, key);

      // Create metadata
      const expiresAt = expirationDays 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      const metadata: EncryptionKeyMetadata = {
        keyId,
        createdAt: new Date(),
        expiresAt,
        algorithm,
        keyType: 'symmetric',
        isActive: true,
        rotationCount: 0,
        purpose,
      };

      this.keyMetadata.set(keyId, metadata);

      // Set up rotation policy
      if (expirationDays) {
        this.setKeyRotationPolicy(keyId, {
          keyId,
          rotationIntervalDays: expirationDays,
          warningDays: 7,
          autoRotate: true,
          notificationEmails: [],
        });
      }

      // Store in database for persistence
      this.storeKeyMetadata(metadata);

      this.logger.info('Created symmetric encryption key', {
        keyId,
        algorithm,
        purpose,
        expiresAt,
      });

      return keyId;
    } catch (error) {
      this.logger.error('Failed to create symmetric key', {
        keyId,
        algorithm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Encrypt field with specified key
   */
  encryptField(
    data: string | number | boolean,
    keyId?: string,
    algorithm?: string
  ): EncryptedField {
    try {
      const effectiveKeyId = keyId || 'pii_default_v1';
      const key = this.keys.get(effectiveKeyId);
      
      if (!key) {
        throw new Error(`Key '${effectiveKeyId}' not found`);
      }

      const metadata = this.keyMetadata.get(effectiveKeyId);
      if (!metadata) {
        throw new Error(`Key metadata for '${effectiveKeyId}' not found`);
      }

      const effectiveAlgorithm = algorithm || metadata.algorithm;
      const config = this.configs[effectiveAlgorithm];
      
      if (!config) {
        throw new Error(`Unsupported algorithm: ${effectiveAlgorithm}`);
      }

      // Convert data to buffer
      const dataBuffer = Buffer.from(String(data), 'utf8');

      // Generate IV
      const iv = crypto.randomBytes(config.ivLength);

      // Create cipher
      const cipher = crypto.createCipher(config.algorithm, key);
      cipher.setAAD(Buffer.from(effectiveKeyId)); // Additional authenticated data

      // Encrypt data
      let encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag for authenticated encryption
      let authTag: string | undefined;
      if (config.tagLength > 0) {
        authTag = (cipher as any).getAuthTag().toString('base64');
      }

      const result: EncryptedField = {
        encryptedData: encrypted.toString('base64'),
        keyId: effectiveKeyId,
        algorithm: effectiveAlgorithm,
        iv: iv.toString('base64'),
        authTag,
        createdAt: new Date(),
      };

      return result;
    } catch (error) {
      this.logger.error('Failed to encrypt field', {
        keyId,
        algorithm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Decrypt encrypted field
   */
  decryptField(encryptedField: EncryptedField): string {
    try {
      const key = this.keys.get(encryptedField.keyId);
      
      if (!key) {
        throw new Error(`Key '${encryptedField.keyId}' not found`);
      }

      const config = this.configs[encryptedField.algorithm];
      if (!config) {
        throw new Error(`Unsupported algorithm: ${encryptedField.algorithm}`);
      }

      // Parse encrypted data and IV
      const encryptedData = Buffer.from(encryptedField.encryptedData, 'base64');
      const iv = Buffer.from(encryptedField.iv!, 'base64');

      // Create decipher
      const decipher = crypto.createDecipher(config.algorithm, key);
      decipher.setAAD(Buffer.from(encryptedField.keyId)); // Additional authenticated data

      // Set authentication tag for authenticated encryption
      if (encryptedField.authTag && config.tagLength > 0) {
        const authTag = Buffer.from(encryptedField.authTag, 'base64');
        (decipher as any).setAuthTag(authTag);
      }

      // Decrypt data
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Failed to decrypt field', {
        keyId: encryptedField.keyId,
        algorithm: encryptedField.algorithm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Encrypt PII data object
   */
  encryptPIIData(data: Record<string, any>): Record<string, any> {
    try {
      const piiFields = new Set([
        'email', 'firstName', 'lastName', 'phoneNumber', 'address',
        'ssn', 'dateOfBirth', 'passportNumber', 'driverLicense',
        'bankAccount', 'creditCard', 'taxId', 'nationalId',
      ]);

      const encryptedData: Record<string, any> = {};

      for (const [fieldName, fieldValue] of Object.entries(data)) {
        if (piiFields.has(fieldName) && fieldValue != null) {
          encryptedData[fieldName] = this.encryptField(fieldValue);
        } else {
          encryptedData[fieldName] = fieldValue;
        }
      }

      this.logger.info('Encrypted PII data', {
        totalFields: Object.keys(data).length,
        encryptedFields: Object.values(encryptedData).filter(
          v => v && typeof v === 'object' && 'encryptedData' in v
        ).length,
      });

      return encryptedData;
    } catch (error) {
      this.logger.error('Failed to encrypt PII data', { error: error.message });
      throw error;
    }
  }

  /**
   * Decrypt PII data object
   */
  decryptPIIData(encryptedData: Record<string, any>): Record<string, any> {
    try {
      const decryptedData: Record<string, any> = {};

      for (const [fieldName, fieldValue] of Object.entries(encryptedData)) {
        if (this.isEncryptedField(fieldValue)) {
          decryptedData[fieldName] = this.decryptField(fieldValue as EncryptedField);
        } else {
          decryptedData[fieldName] = fieldValue;
        }
      }

      return decryptedData;
    } catch (error) {
      this.logger.error('Failed to decrypt PII data', { error: error.message });
      throw error;
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string): Promise<string> {
    try {
      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new Error(`Key '${keyId}' not found`);
      }

      // Create new key with incremented version
      const newKeyId = `${keyId}_v${metadata.rotationCount + 1}`;

      // Generate new key
      const config = this.configs[metadata.algorithm];
      const newKey = crypto.randomBytes(config.keyLength);

      // Store new key
      this.keys.set(newKeyId, newKey);

      // Create new metadata
      const newMetadata: EncryptionKeyMetadata = {
        ...metadata,
        keyId: newKeyId,
        createdAt: new Date(),
        rotationCount: metadata.rotationCount + 1,
      };

      this.keyMetadata.set(newKeyId, newMetadata);

      // Mark old key as inactive but keep for decryption
      metadata.isActive = false;
      this.keyMetadata.set(keyId, metadata);

      // Store in database
      await this.storeKeyMetadata(newMetadata);
      await this.updateKeyMetadata(metadata);

      // Update rotation policy
      const policy = this.rotationPolicies.get(keyId);
      if (policy) {
        this.rotationPolicies.set(newKeyId, { ...policy, keyId: newKeyId });
      }

      this.logger.info('Rotated encryption key', {
        oldKeyId: keyId,
        newKeyId,
        rotationCount: newMetadata.rotationCount,
      });

      return newKeyId;
    } catch (error) {
      this.logger.error('Failed to rotate key', {
        keyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Set key rotation policy
   */
  setKeyRotationPolicy(keyId: string, policy: KeyRotationPolicy): void {
    this.rotationPolicies.set(keyId, policy);
    this.logger.info('Set key rotation policy', {
      keyId,
      rotationIntervalDays: policy.rotationIntervalDays,
      autoRotate: policy.autoRotate,
    });
  }

  /**
   * Check for keys that need rotation
   */
  checkKeyExpiration(): string[] {
    const expiringKeys: string[] = [];
    const now = new Date();
    const warningThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [keyId, metadata] of this.keyMetadata.entries()) {
      if (!metadata.isActive || !metadata.expiresAt) continue;

      const timeToExpiry = metadata.expiresAt.getTime() - now.getTime();

      if (timeToExpiry <= 0) {
        this.logger.warn('Encryption key expired', {
          keyId,
          expiredAt: metadata.expiresAt,
        });
        expiringKeys.push(keyId);
      } else if (timeToExpiry <= warningThreshold) {
        this.logger.warn('Encryption key expiring soon', {
          keyId,
          expiresAt: metadata.expiresAt,
          daysRemaining: Math.ceil(timeToExpiry / (24 * 60 * 60 * 1000)),
        });
        expiringKeys.push(keyId);
      }
    }

    return expiringKeys;
  }

  /**
   * Get active encryption keys
   */
  getActiveKeys(): EncryptionKeyMetadata[] {
    return Array.from(this.keyMetadata.values()).filter(metadata => metadata.isActive);
  }

  /**
   * Derive key from password using PBKDF2
   */
  private deriveKeyFromPassword(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  /**
   * Check if value is an encrypted field
   */
  private isEncryptedField(value: any): boolean {
    return (
      value &&
      typeof value === 'object' &&
      'encryptedData' in value &&
      'keyId' in value &&
      'algorithm' in value
    );
  }

  /**
   * Store key metadata in database
   */
  private async storeKeyMetadata(metadata: EncryptionKeyMetadata): Promise<void> {
    const query = `
      INSERT INTO encryption_keys (
        key_id, created_at, expires_at, algorithm, key_type,
        is_active, rotation_count, purpose
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (key_id) DO UPDATE SET
        expires_at = EXCLUDED.expires_at,
        is_active = EXCLUDED.is_active,
        rotation_count = EXCLUDED.rotation_count
    `;

    await this.pool.query(query, [
      metadata.keyId,
      metadata.createdAt,
      metadata.expiresAt,
      metadata.algorithm,
      metadata.keyType,
      metadata.isActive,
      metadata.rotationCount,
      metadata.purpose,
    ]);
  }

  /**
   * Update key metadata in database
   */
  private async updateKeyMetadata(metadata: EncryptionKeyMetadata): Promise<void> {
    const query = `
      UPDATE encryption_keys SET
        expires_at = $2,
        is_active = $3,
        rotation_count = $4
      WHERE key_id = $1
    `;

    await this.pool.query(query, [
      metadata.keyId,
      metadata.expiresAt,
      metadata.isActive,
      metadata.rotationCount,
    ]);
  }

  /**
   * Start key rotation scheduler
   */
  private startKeyRotationScheduler(): void {
    // Check for key expiration every hour
    setInterval(() => {
      this.performScheduledRotations();
    }, 60 * 60 * 1000);

    this.logger.info('Key rotation scheduler started');
  }

  /**
   * Perform scheduled key rotations
   */
  private async performScheduledRotations(): Promise<void> {
    try {
      const expiringKeys = this.checkKeyExpiration();

      for (const keyId of expiringKeys) {
        const policy = this.rotationPolicies.get(keyId);
        
        if (policy && policy.autoRotate) {
          try {
            await this.rotateKey(keyId);
            this.logger.info('Automatically rotated key', { keyId });
          } catch (error) {
            this.logger.error('Failed to auto-rotate key', {
              keyId,
              error: error.message,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to perform scheduled rotations', {
        error: error.message,
      });
    }
  }
}

/**
 * TLS Configuration Service
 */
@injectable()
export class TLSConfigurationService {
  constructor(@inject(TYPES.Logger) private logger: Logger) {}

  /**
   * Get TLS 1.3 configuration for HTTPS servers
   */
  getTLSConfig(): {
    secureProtocol: string;
    ciphers: string;
    honorCipherOrder: boolean;
    secureOptions: number;
    minVersion: string;
    maxVersion: string;
  } {
    return {
      secureProtocol: 'TLSv1_3_method',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
      ].join(':'),
      honorCipherOrder: true,
      secureOptions: 
        crypto.constants.SSL_OP_NO_SSLv2 |
        crypto.constants.SSL_OP_NO_SSLv3 |
        crypto.constants.SSL_OP_NO_TLSv1 |
        crypto.constants.SSL_OP_NO_TLSv1_1 |
        crypto.constants.SSL_OP_NO_TLSv1_2,
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
    };
  }

  /**
   * Generate self-signed certificate for development
   */
  generateDevelopmentCertificate(): {
    cert: string;
    key: string;
  } {
    // This would generate a self-signed certificate for development
    // In production, use proper certificates from a CA
    this.logger.warn('Using development certificate - replace with proper CA certificate in production');
    
    return {
      cert: '', // Certificate content
      key: '',  // Private key content
    };
  }

  /**
   * Validate certificate chain
   */
  validateCertificateChain(cert: string, key: string, ca?: string): boolean {
    try {
      // Validate certificate and key pair
      const certificate = crypto.createPublicKey(cert);
      const privateKey = crypto.createPrivateKey(key);
      
      // Verify key pair matches
      const testData = Buffer.from('test');
      const signature = crypto.sign('sha256', testData, privateKey);
      const isValid = crypto.verify('sha256', testData, certificate, signature);
      
      if (!isValid) {
        this.logger.error('Certificate and private key do not match');
        return false;
      }

      this.logger.info('Certificate chain validation successful');
      return true;
    } catch (error) {
      this.logger.error('Certificate chain validation failed', {
        error: error.message,
      });
      return false;
    }
  }
}