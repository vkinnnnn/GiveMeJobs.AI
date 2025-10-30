export interface BlockchainCredential {
  id: string;
  userId: string;
  credentialType: 'degree' | 'certification' | 'transcript' | 'license';
  credentialHash: string;
  encryptedData: string;
  encryptionIv: string;
  encryptionAuthTag: string;
  blockchainTxId: string;
  blockNumber: number;
  timestamp: Date;
  issuer: string;
  expiryDate?: Date;
  metadata?: Record<string, any>;
}

export interface AccessGrant {
  id: string;
  credentialId: string;
  grantedTo: string; // Company/employer ID or email
  grantedBy: string; // User ID
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
  revokedAt?: Date;
}

export interface AccessLogEntry {
  id: string;
  credentialId: string;
  grantId?: string;
  timestamp: Date;
  action: 'granted' | 'accessed' | 'revoked' | 'verification_requested' | 'verification_completed';
  accessor: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface CredentialVerification {
  credentialId: string;
  isValid: boolean;
  issuer: string;
  issuedDate: Date;
  expiryDate?: Date;
  verifiedAt: Date;
  blockchainProof: {
    txId: string;
    blockNumber: number;
    hashMatch: boolean;
    status: 'confirmed' | 'pending' | 'failed';
  };
}

export interface CredentialStorageRequest {
  userId: string;
  credentialType: 'degree' | 'certification' | 'transcript' | 'license';
  credentialData: {
    title: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    details: Record<string, any>;
  };
}

export interface AccessGrantRequest {
  credentialId: string;
  grantedTo: string;
  expiresInDays: number;
  purpose?: string;
}

export interface CredentialAccessResponse {
  credential: {
    id: string;
    type: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    verified: boolean;
  };
  data: Record<string, any>;
  blockchainProof: {
    txId: string;
    blockNumber: number;
    verified: boolean;
  };
}
