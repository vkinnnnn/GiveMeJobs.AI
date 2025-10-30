# Blockchain Service Quick Start Guide

## Overview

The Blockchain Credential Storage Service allows users to securely store and share academic and professional credentials with blockchain-backed verification.

## Quick Setup

### 1. Run Database Migration

```bash
cd packages/backend
npm run migrate:up
```

This creates the following tables:
- `blockchain_credentials` - Stores credential metadata
- `access_grants` - Manages access permissions
- `access_logs` - Audit trail

### 2. Start the Server

```bash
npm run dev
```

The blockchain endpoints will be available at `/api/blockchain/*`

## Common Use Cases

### Use Case 1: Store a Degree Certificate

```typescript
// User stores their degree certificate
POST /api/blockchain/credentials/store
Authorization: Bearer <user_token>

{
  "credentialType": "degree",
  "credentialData": {
    "title": "Bachelor of Science in Computer Science",
    "issuer": "Stanford University",
    "issueDate": "2020-05-15",
    "details": {
      "gpa": 3.9,
      "honors": "Summa Cum Laude",
      "major": "Computer Science",
      "minor": "Mathematics"
    }
  }
}

Response:
{
  "message": "Credential stored successfully",
  "credential": {
    "id": "cred-123",
    "type": "degree",
    "issuer": "Stanford University",
    "blockchainTxId": "tx-abc123",
    "blockNumber": 12345,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Use Case 2: Share Credential with Employer

```typescript
// User grants access to employer for 30 days
POST /api/blockchain/credentials/cred-123/grant-access
Authorization: Bearer <user_token>

{
  "grantedTo": "hr@techcorp.com",
  "expiresInDays": 30,
  "purpose": "Job application for Senior Developer position"
}

Response:
{
  "message": "Access granted successfully",
  "grant": {
    "id": "grant-456",
    "grantedTo": "hr@techcorp.com",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-02-15T10:30:00Z"
  }
}

// User shares the access token with employer
// Employer can now verify and access the credential
```

### Use Case 3: Employer Verifies Credential

```typescript
// Employer verifies the credential (no auth required)
GET /api/blockchain/credentials/cred-123/verify?accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response:
{
  "verification": {
    "credentialId": "cred-123",
    "isValid": true,
    "issuer": "Stanford University",
    "issuedDate": "2024-01-15T10:30:00Z",
    "verifiedAt": "2024-01-20T15:45:00Z",
    "blockchainProof": {
      "txId": "tx-abc123",
      "blockNumber": 12345,
      "hashMatch": true,
      "status": "confirmed"
    }
  }
}
```

### Use Case 4: Employer Accesses Full Credential

```typescript
// Employer accesses full credential data (no auth required, but needs token)
GET /api/blockchain/access/cred-123?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response:
{
  "credential": {
    "id": "cred-123",
    "type": "degree",
    "issuer": "Stanford University",
    "issueDate": "2024-01-15T10:30:00Z",
    "verified": true
  },
  "data": {
    "title": "Bachelor of Science in Computer Science",
    "issuer": "Stanford University",
    "issueDate": "2020-05-15",
    "details": {
      "gpa": 3.9,
      "honors": "Summa Cum Laude",
      "major": "Computer Science",
      "minor": "Mathematics"
    }
  },
  "blockchainProof": {
    "txId": "tx-abc123",
    "blockNumber": 12345,
    "hashMatch": true,
    "status": "confirmed"
  }
}
```

### Use Case 5: User Revokes Access

```typescript
// User revokes employer's access
POST /api/blockchain/credentials/cred-123/revoke-access
Authorization: Bearer <user_token>

{
  "grantId": "grant-456"
}

Response:
{
  "message": "Access revoked successfully",
  "revoked": true
}

// Employer can no longer access the credential
```

### Use Case 6: User Views Access History

```typescript
// User checks who accessed their credential
GET /api/blockchain/credentials/cred-123/access-log?limit=10
Authorization: Bearer <user_token>

Response:
{
  "logs": [
    {
      "id": "log-789",
      "credentialId": "cred-123",
      "timestamp": "2024-01-20T15:45:00Z",
      "action": "accessed",
      "accessor": "hr@techcorp.com",
      "ipAddress": "203.0.113.42",
      "success": true
    },
    {
      "id": "log-790",
      "credentialId": "cred-123",
      "timestamp": "2024-01-20T15:30:00Z",
      "action": "granted",
      "accessor": "hr@techcorp.com",
      "success": true
    }
  ],
  "total": 2,
  "limit": 10,
  "offset": 0
}
```

### Use Case 7: User Views Access Statistics

```typescript
// User gets statistics about credential access
GET /api/blockchain/credentials/cred-123/stats
Authorization: Bearer <user_token>

Response:
{
  "stats": {
    "totalAccesses": 15,
    "successfulAccesses": 14,
    "failedAccesses": 1,
    "uniqueAccessors": 3,
    "lastAccessed": "2024-01-20T15:45:00Z",
    "accessesByAction": {
      "granted": 3,
      "accessed": 10,
      "revoked": 1,
      "verification_completed": 1
    }
  }
}
```

## Integration Examples

### Frontend Integration (React)

```typescript
// Store credential
const storeCredential = async (credentialData) => {
  const response = await fetch('/api/blockchain/credentials/store', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentialType: 'degree',
      credentialData,
    }),
  });
  
  return response.json();
};

// Grant access
const grantAccess = async (credentialId, employerEmail) => {
  const response = await fetch(`/api/blockchain/credentials/${credentialId}/grant-access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grantedTo: employerEmail,
      expiresInDays: 30,
      purpose: 'Job application verification',
    }),
  });
  
  return response.json();
};

// View credentials
const getCredentials = async () => {
  const response = await fetch('/api/blockchain/credentials', {
    headers: {
      'Authorization': `Bearer ${userToken}`,
    },
  });
  
  return response.json();
};
```

### Backend Integration (Node.js)

```typescript
import { blockchainService } from './services/blockchain.service';

// Store credential programmatically
const credential = await blockchainService.storeCredential({
  userId: 'user-123',
  credentialType: 'certification',
  credentialData: {
    title: 'AWS Certified Solutions Architect',
    issuer: 'Amazon Web Services',
    issueDate: new Date('2023-06-15'),
    expiryDate: new Date('2026-06-15'),
    details: {
      certificationId: 'AWS-CSA-12345',
      level: 'Professional',
    },
  },
});

// Grant access
const grant = await blockchainService.grantAccess(
  {
    credentialId: credential.id,
    grantedTo: 'employer@company.com',
    expiresInDays: 30,
  },
  'user-123'
);

// Verify credential
const verification = await blockchainService.verifyCredential(credential.id);
console.log('Is valid:', verification.isValid);
```

## Security Best Practices

### 1. Access Token Management
- Never expose access tokens in URLs (use request headers when possible)
- Set appropriate expiration times (default: 30 days)
- Revoke tokens immediately when no longer needed

### 2. Credential Data
- Only store necessary information
- Avoid storing sensitive personal data that isn't required
- Use the `details` field for additional metadata

### 3. Access Logging
- Regularly review access logs for suspicious activity
- Monitor failed access attempts
- Set up alerts for unusual patterns

### 4. GDPR Compliance
- Users can delete credentials at any time
- All access grants are automatically revoked on deletion
- Audit logs are maintained for compliance

## Troubleshooting

### Issue: "Encryption key not found for user"
**Solution**: The user's encryption key hasn't been generated. This happens automatically on first credential storage, but you can manually generate it:

```typescript
import { keyManagementSystem } from './config/blockchain.config';
keyManagementSystem.generateUserKey(userId);
```

### Issue: "Invalid or expired access token"
**Solution**: The access token has either expired or been revoked. Request a new access grant from the credential owner.

### Issue: "Credential verification failed"
**Solution**: The credential hash doesn't match the blockchain record. This could indicate tampering. Check the blockchain transaction status.

### Issue: "Transaction not found on blockchain"
**Solution**: The blockchain transaction may not have been confirmed yet. Wait a few moments and try again.

## Testing

### Run Integration Tests

```bash
npm run test -- blockchain.integration.test.ts
```

### Manual Testing with cURL

```bash
# Store credential
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

# Get credentials
curl http://localhost:3000/api/blockchain/credentials \
  -H "Authorization: Bearer YOUR_TOKEN"

# Grant access
curl -X POST http://localhost:3000/api/blockchain/credentials/CRED_ID/grant-access \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grantedTo": "employer@company.com",
    "expiresInDays": 30
  }'
```

## Next Steps

1. **Production Deployment**: Replace simulated blockchain with Hyperledger Fabric or Ethereum
2. **Key Management**: Integrate with AWS KMS or Azure Key Vault
3. **Monitoring**: Set up alerts for failed verifications and unusual access patterns
4. **UI Integration**: Build frontend components for credential management
5. **Mobile Support**: Add mobile-specific endpoints and optimizations

## Support

For more information, see:
- [Full Documentation](./BLOCKCHAIN_SERVICE.md)
- [API Reference](./BLOCKCHAIN_SERVICE.md#api-endpoints)
- [Security Guide](./BLOCKCHAIN_SERVICE.md#security-features)
