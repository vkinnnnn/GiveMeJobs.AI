# Blockchain Credential Storage Service

## Overview

The Blockchain Credential Storage Service provides secure, immutable storage for academic and professional credentials using blockchain technology. This service implements encryption, access control, and audit logging to ensure credential authenticity and user privacy.

## Features

- **Secure Storage**: Credentials are encrypted using AES-256-GCM before storage
- **Blockchain Verification**: Cryptographic hashes stored on blockchain for immutability
- **Access Control**: Time-limited access tokens for credential sharing
- **Audit Trail**: Complete logging of all credential access attempts
- **GDPR Compliance**: User-controlled access with revocation capabilities

## Architecture

### Components

1. **Blockchain Client** (`blockchain.config.ts`)
   - Simulated blockchain implementation (can be replaced with Hyperledger Fabric or Ethereum)
   - Encryption/decryption utilities
   - Hash generation and verification

2. **Key Management System**
   - Per-user encryption keys
   - Key rotation support
   - Secure key storage

3. **Blockchain Service** (`blockchain.service.ts`)
   - Credential storage and retrieval
   - Access grant management
   - Verification and audit logging

4. **API Endpoints** (`blockchain.routes.ts`)
   - RESTful API for credential operations
   - Protected and public endpoints

## Database Schema

### blockchain_credentials
Stores credential metadata and blockchain references.

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- credential_type: ENUM ('degree', 'certification', 'transcript', 'license')
- credential_hash: VARCHAR(255) - SHA-256 hash
- encrypted_data: TEXT - AES-256-GCM encrypted credential data
- encryption_iv: VARCHAR(255) - Initialization vector
- encryption_auth_tag: VARCHAR(255) - Authentication tag
- blockchain_tx_id: VARCHAR(255) - Blockchain transaction ID
- block_number: INTEGER - Block number on blockchain
- issuer: VARCHAR(255) - Credential issuer
- expiry_date: TIMESTAMP (optional)
- metadata: JSONB - Additional metadata
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### access_grants
Manages time-limited access to credentials.

```sql
- id: UUID (primary key)
- credential_id: UUID (foreign key to blockchain_credentials)
- granted_to: VARCHAR(255) - Recipient identifier (email/company ID)
- granted_by: UUID (foreign key to users)
- access_token: VARCHAR(255) - Unique access token
- expires_at: TIMESTAMP - Token expiration
- revoked: BOOLEAN - Revocation status
- revoked_at: TIMESTAMP (optional)
- purpose: TEXT (optional) - Purpose of access
- created_at: TIMESTAMP
```

### access_logs
Audit trail of all credential access attempts.

```sql
- id: UUID (primary key)
- credential_id: UUID (foreign key to blockchain_credentials)
- grant_id: UUID (foreign key to access_grants, optional)
- action: ENUM ('granted', 'accessed', 'revoked', 'verification_requested', 'verification_completed')
- accessor: VARCHAR(255) - Who accessed the credential
- ip_address: VARCHAR(45) (optional)
- user_agent: TEXT (optional)
- success: BOOLEAN - Whether access was successful
- metadata: JSONB - Additional context
- timestamp: TIMESTAMP
```

## API Endpoints

### Protected Endpoints (Require Authentication)

#### Store Credential
```http
POST /api/blockchain/credentials/store
Authorization: Bearer <token>

Request Body:
{
  "credentialType": "degree",
  "credentialData": {
    "title": "Bachelor of Science in Computer Science",
    "issuer": "University of Example",
    "issueDate": "2020-05-15",
    "expiryDate": null,
    "details": {
      "gpa": 3.8,
      "honors": "Magna Cum Laude"
    }
  }
}

Response:
{
  "message": "Credential stored successfully",
  "credential": {
    "id": "uuid",
    "type": "degree",
    "issuer": "University of Example",
    "blockchainTxId": "tx_id",
    "blockNumber": 12345,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Get User Credentials
```http
GET /api/blockchain/credentials
Authorization: Bearer <token>

Response:
{
  "credentials": [
    {
      "id": "uuid",
      "type": "degree",
      "issuer": "University of Example",
      "blockchainTxId": "tx_id",
      "timestamp": "2024-01-15T10:30:00Z",
      "expiryDate": null,
      "metadata": {...}
    }
  ]
}
```

#### Get Credential by ID
```http
GET /api/blockchain/credentials/:id?includeData=true
Authorization: Bearer <token>

Response:
{
  "credential": {
    "id": "uuid",
    "type": "degree",
    "issuer": "University of Example",
    "blockchainTxId": "tx_id",
    "blockNumber": 12345,
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "title": "Bachelor of Science in Computer Science",
      "issuer": "University of Example",
      "issueDate": "2020-05-15",
      "details": {...}
    }
  }
}
```

#### Grant Access
```http
POST /api/blockchain/credentials/:id/grant-access
Authorization: Bearer <token>

Request Body:
{
  "grantedTo": "employer@company.com",
  "expiresInDays": 30,
  "purpose": "Job application verification"
}

Response:
{
  "message": "Access granted successfully",
  "grant": {
    "id": "uuid",
    "grantedTo": "employer@company.com",
    "accessToken": "access_token_here",
    "expiresAt": "2024-02-15T10:30:00Z"
  }
}
```

#### Revoke Access
```http
POST /api/blockchain/credentials/:id/revoke-access
Authorization: Bearer <token>

Request Body:
{
  "grantId": "uuid"
  // OR
  "accessToken": "access_token_here"
}

Response:
{
  "message": "Access revoked successfully",
  "revoked": true
}
```

#### Revoke All Access
```http
POST /api/blockchain/credentials/:id/revoke-all
Authorization: Bearer <token>

Response:
{
  "message": "All access revoked successfully",
  "revokedCount": 3
}
```

#### Get Access Logs
```http
GET /api/blockchain/credentials/:id/access-log?limit=50&offset=0&action=accessed
Authorization: Bearer <token>

Response:
{
  "logs": [
    {
      "id": "uuid",
      "credentialId": "uuid",
      "timestamp": "2024-01-15T10:30:00Z",
      "action": "accessed",
      "accessor": "employer@company.com",
      "ipAddress": "192.168.1.1",
      "success": true,
      "metadata": {...}
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### Get Access Statistics
```http
GET /api/blockchain/credentials/:id/stats
Authorization: Bearer <token>

Response:
{
  "stats": {
    "totalAccesses": 25,
    "successfulAccesses": 23,
    "failedAccesses": 2,
    "uniqueAccessors": 5,
    "lastAccessed": "2024-01-15T10:30:00Z",
    "accessesByAction": {
      "granted": 5,
      "accessed": 18,
      "revoked": 2
    }
  }
}
```

#### Get Credential Grants
```http
GET /api/blockchain/credentials/:id/grants
Authorization: Bearer <token>

Response:
{
  "grants": [
    {
      "id": "uuid",
      "credentialId": "uuid",
      "grantedTo": "employer@company.com",
      "accessToken": "token",
      "expiresAt": "2024-02-15T10:30:00Z",
      "revoked": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Delete Credential
```http
DELETE /api/blockchain/credentials/:id
Authorization: Bearer <token>

Response:
{
  "message": "Credential deleted successfully"
}
```

### Public Endpoints

#### Verify Credential
```http
GET /api/blockchain/credentials/:id/verify?accessToken=token

Response:
{
  "verification": {
    "credentialId": "uuid",
    "isValid": true,
    "issuer": "University of Example",
    "issuedDate": "2024-01-15T10:30:00Z",
    "expiryDate": null,
    "verifiedAt": "2024-01-20T15:45:00Z",
    "blockchainProof": {
      "txId": "tx_id",
      "blockNumber": 12345,
      "hashMatch": true,
      "status": "confirmed"
    }
  }
}
```

#### Access Credential (with token)
```http
GET /api/blockchain/access/:credentialId?token=access_token

Response:
{
  "credential": {
    "id": "uuid",
    "type": "degree",
    "issuer": "University of Example",
    "issueDate": "2024-01-15T10:30:00Z",
    "verified": true
  },
  "data": {
    "title": "Bachelor of Science in Computer Science",
    "issuer": "University of Example",
    "issueDate": "2020-05-15",
    "details": {...}
  },
  "blockchainProof": {
    "txId": "tx_id",
    "blockNumber": 12345,
    "hashMatch": true,
    "status": "confirmed"
  }
}
```

## Security Features

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Management**: Per-user encryption keys stored securely
- **Data Protection**: Only encrypted data stored in database

### Blockchain Immutability
- Cryptographic hashes stored on blockchain
- Tamper-proof verification
- Transaction IDs for audit trail

### Access Control
- Time-limited access tokens
- Granular permission management
- Instant revocation capability

### Audit Logging
- All access attempts logged
- IP address and user agent tracking
- Success/failure tracking
- Comprehensive metadata

## GDPR Compliance

### Right to Access
Users can retrieve all their credentials and access logs.

### Right to Erasure
- Credential metadata can be deleted from database
- Blockchain hashes remain (immutable) but become inaccessible
- All access grants automatically revoked

### Data Portability
Users can export their credential data in JSON format.

### Access Control
Users have full control over who can access their credentials and for how long.

## Production Deployment

### Blockchain Integration

To integrate with actual blockchain networks:

1. **Hyperledger Fabric**
```typescript
// Replace blockchain.config.ts implementation
import { Gateway, Wallets } from 'fabric-network';

// Configure connection profile
// Implement chaincode interactions
```

2. **Ethereum**
```typescript
// Replace blockchain.config.ts implementation
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

// Configure Web3 provider
// Deploy and interact with smart contracts
```

### Key Management

For production, integrate with Hardware Security Modules (HSM):

```typescript
// Use AWS KMS, Azure Key Vault, or similar
import { KMSClient, EncryptCommand } from '@aws-sdk/client-kms';
```

### Environment Variables

```env
# Blockchain Configuration
BLOCKCHAIN_NETWORK=hyperledger  # or 'ethereum'
BLOCKCHAIN_ENDPOINT=https://blockchain-node.example.com
BLOCKCHAIN_CHAIN_ID=channel1

# Key Management
KMS_KEY_ID=your-kms-key-id
KMS_REGION=us-east-1
```

## Testing

### Run Migrations
```bash
npm run migrate:up
```

### Test Credential Storage
```bash
curl -X POST http://localhost:3000/api/blockchain/credentials/store \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialType": "degree",
    "credentialData": {
      "title": "Test Degree",
      "issuer": "Test University",
      "issueDate": "2020-05-15",
      "details": {}
    }
  }'
```

## Monitoring

### Key Metrics
- Credential storage rate
- Verification requests per second
- Access grant creation/revocation rate
- Failed access attempts
- Blockchain transaction confirmation time

### Alerts
- Failed blockchain transactions
- Unusual access patterns
- High rate of failed verifications
- Expired grants not cleaned up

## Future Enhancements

1. **Multi-signature verification** - Require multiple parties to verify credentials
2. **Credential templates** - Pre-defined templates for common credential types
3. **Batch operations** - Store/verify multiple credentials at once
4. **Credential marketplace** - Allow institutions to issue credentials directly
5. **Zero-knowledge proofs** - Verify credentials without revealing full data
6. **Cross-chain support** - Support multiple blockchain networks

## Support

For issues or questions:
- Check the troubleshooting guide
- Review audit logs for access issues
- Verify blockchain network connectivity
- Ensure encryption keys are properly managed
