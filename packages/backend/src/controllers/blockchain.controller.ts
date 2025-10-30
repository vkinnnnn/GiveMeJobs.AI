import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service';
import { CredentialStorageRequest, AccessGrantRequest } from '../types/blockchain.types';

export class BlockchainController {
  /**
   * Store credential on blockchain
   * POST /api/blockchain/credentials/store
   */
  async storeCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: CredentialStorageRequest = {
        userId,
        credentialType: req.body.credentialType,
        credentialData: req.body.credentialData,
      };

      const credential = await blockchainService.storeCredential(request);

      res.status(201).json({
        message: 'Credential stored successfully',
        credential: {
          id: credential.id,
          type: credential.credentialType,
          issuer: credential.issuer,
          blockchainTxId: credential.blockchainTxId,
          blockNumber: credential.blockNumber,
          timestamp: credential.timestamp,
        },
      });
    } catch (error: any) {
      console.error('Error storing credential:', error);
      res.status(500).json({ error: error.message || 'Failed to store credential' });
    }
  }

  /**
   * Get user's credentials
   * GET /api/blockchain/credentials
   */
  async getUserCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const credentials = await blockchainService.getUserCredentials(userId);

      res.json({
        credentials: credentials.map(c => ({
          id: c.id,
          type: c.credentialType,
          issuer: c.issuer,
          blockchainTxId: c.blockchainTxId,
          timestamp: c.timestamp,
          expiryDate: c.expiryDate,
          metadata: c.metadata,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch credentials' });
    }
  }

  /**
   * Get credential by ID
   * GET /api/blockchain/credentials/:id
   */
  async getCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const credential = await blockchainService.getCredential(id, userId);

      if (!credential) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      // Decrypt data if requested
      let decryptedData;
      if (req.query.includeData === 'true') {
        decryptedData = await blockchainService.decryptCredentialData(credential);
      }

      res.json({
        credential: {
          id: credential.id,
          type: credential.credentialType,
          issuer: credential.issuer,
          blockchainTxId: credential.blockchainTxId,
          blockNumber: credential.blockNumber,
          timestamp: credential.timestamp,
          expiryDate: credential.expiryDate,
          metadata: credential.metadata,
          data: decryptedData,
        },
      });
    } catch (error: any) {
      console.error('Error fetching credential:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch credential' });
    }
  }

  /**
   * Verify credential
   * GET /api/blockchain/credentials/:id/verify
   */
  async verifyCredential(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const accessToken = req.query.accessToken as string;

      const verification = await blockchainService.verifyCredential(id, accessToken);

      res.json({ verification });
    } catch (error: any) {
      console.error('Error verifying credential:', error);
      res.status(500).json({ error: error.message || 'Failed to verify credential' });
    }
  }

  /**
   * Grant access to credential
   * POST /api/blockchain/credentials/:id/grant-access
   */
  async grantAccess(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const request: AccessGrantRequest = {
        credentialId: id,
        grantedTo: req.body.grantedTo,
        expiresInDays: req.body.expiresInDays || 30,
        purpose: req.body.purpose,
      };

      const grant = await blockchainService.grantAccess(request, userId);

      res.status(201).json({
        message: 'Access granted successfully',
        grant: {
          id: grant.id,
          grantedTo: grant.grantedTo,
          accessToken: grant.accessToken,
          expiresAt: grant.expiresAt,
        },
      });
    } catch (error: any) {
      console.error('Error granting access:', error);
      res.status(500).json({ error: error.message || 'Failed to grant access' });
    }
  }

  /**
   * Revoke access grant
   * POST /api/blockchain/credentials/:id/revoke-access
   */
  async revokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { grantId, accessToken } = req.body;

      let revoked = false;
      if (grantId) {
        revoked = await blockchainService.revokeAccessGrant(grantId, userId);
      } else if (accessToken) {
        revoked = await blockchainService.revokeAccessByToken(accessToken, userId);
      } else {
        res.status(400).json({ error: 'Either grantId or accessToken is required' });
        return;
      }

      res.json({
        message: 'Access revoked successfully',
        revoked,
      });
    } catch (error: any) {
      console.error('Error revoking access:', error);
      res.status(500).json({ error: error.message || 'Failed to revoke access' });
    }
  }

  /**
   * Revoke all access for credential
   * POST /api/blockchain/credentials/:id/revoke-all
   */
  async revokeAllAccess(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const count = await blockchainService.revokeAllCredentialAccess(id, userId);

      res.json({
        message: 'All access revoked successfully',
        revokedCount: count,
      });
    } catch (error: any) {
      console.error('Error revoking all access:', error);
      res.status(500).json({ error: error.message || 'Failed to revoke all access' });
    }
  }

  /**
   * Get access logs for credential
   * GET /api/blockchain/credentials/:id/access-log
   */
  async getAccessLog(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        action: req.query.action as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const { logs, total } = await blockchainService.getCredentialAccessLogs(id, userId, options);

      res.json({
        logs,
        total,
        limit: options.limit,
        offset: options.offset,
      });
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch access logs' });
    }
  }

  /**
   * Get access statistics for credential
   * GET /api/blockchain/credentials/:id/stats
   */
  async getAccessStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const stats = await blockchainService.getCredentialAccessStats(id, userId);

      res.json({ stats });
    } catch (error: any) {
      console.error('Error fetching access stats:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch access stats' });
    }
  }

  /**
   * Get credential grants
   * GET /api/blockchain/credentials/:id/grants
   */
  async getCredentialGrants(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const grants = await blockchainService.getCredentialGrants(id, userId);

      res.json({ grants });
    } catch (error: any) {
      console.error('Error fetching grants:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch grants' });
    }
  }

  /**
   * Access credential with token (public endpoint for employers)
   * GET /api/blockchain/access/:credentialId
   */
  async accessCredential(req: Request, res: Response): Promise<void> {
    try {
      const { credentialId } = req.params;
      const accessToken = req.query.token as string;

      if (!accessToken) {
        res.status(400).json({ error: 'Access token is required' });
        return;
      }

      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      const credentialData = await blockchainService.verifyAndAccessCredential(
        credentialId,
        accessToken,
        ipAddress,
        userAgent
      );

      res.json(credentialData);
    } catch (error: any) {
      console.error('Error accessing credential:', error);
      res.status(403).json({ error: error.message || 'Access denied' });
    }
  }

  /**
   * Delete credential
   * DELETE /api/blockchain/credentials/:id
   */
  async deleteCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const deleted = await blockchainService.deleteCredential(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      res.json({ message: 'Credential deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting credential:', error);
      res.status(500).json({ error: error.message || 'Failed to delete credential' });
    }
  }
}

export const blockchainController = new BlockchainController();
