import { Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service';
import { blockchainClient } from '../config/blockchain.config';
import { z } from 'zod';

// Validation schemas
const storeCredentialSchema = z.object({
  credentialType: z.enum(['degree', 'certification', 'transcript', 'license']),
  credentialData: z.object({
    title: z.string().min(1),
    issuer: z.string().min(1),
    issueDate: z.string().or(z.date()).transform(val => new Date(val)),
    expiryDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
    details: z.record(z.any()),
  }),
});

const grantAccessSchema = z.object({
  grantedTo: z.string().min(1),
  expiresInDays: z.number().min(1).max(365),
  purpose: z.string().optional(),
});

export class BlockchainController {
  /**
   * Store credential on blockchain
   * POST /api/blockchain/credentials/store
   */
  async storeCredential(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = storeCredentialSchema.parse(req.body);

      const credential = await blockchainService.storeCredential({
        userId,
        credentialType: validatedData.credentialType,
        credentialData: validatedData.credentialData,
      });

      res.status(201).json({
        success: true,
        credential: {
          id: credential.id,
          type: credential.credentialType,
          issuer: credential.issuer,
          timestamp: credential.timestamp,
          blockchainTxId: credential.blockchainTxId,
          blockNumber: credential.blockNumber,
        },
      });
    } catch (error) {
      console.error('Store credential error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to store credential',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get user's credentials
   * GET /api/blockchain/credentials
   */
  async getUserCredentials(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const credentials = await blockchainService.getUserCredentials(userId);

      const credentialList = credentials.map(cred => ({
        id: cred.id,
        type: cred.credentialType,
        issuer: cred.issuer,
        timestamp: cred.timestamp,
        expiryDate: cred.expiryDate,
        blockchainTxId: cred.blockchainTxId,
        blockNumber: cred.blockNumber,
      }));

      res.json({
        success: true,
        credentials: credentialList,
        total: credentialList.length,
      });
    } catch (error) {
      console.error('Get credentials error:', error);
      res.status(500).json({
        error: 'Failed to retrieve credentials',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get specific credential
   * GET /api/blockchain/credentials/:id
   */
  async getCredential(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const credential = await blockchainService.getCredential(id, userId);

      if (!credential) {
        return res.status(404).json({ error: 'Credential not found' });
      }

      res.json({
        success: true,
        credential: {
          id: credential.id,
          type: credential.credentialType,
          issuer: credential.issuer,
          timestamp: credential.timestamp,
          expiryDate: credential.expiryDate,
          blockchainTxId: credential.blockchainTxId,
          blockNumber: credential.blockNumber,
        },
      });
    } catch (error) {
      console.error('Get credential error:', error);
      res.status(500).json({
        error: 'Failed to retrieve credential',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify credential authenticity
   * GET /api/blockchain/credentials/:id/verify
   */
  async verifyCredential(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { accessToken } = req.query;

      const verification = await blockchainService.verifyCredential(
        id,
        accessToken as string
      );

      res.json({
        success: true,
        verification,
      });
    } catch (error) {
      console.error('Verify credential error:', error);
      res.status(500).json({
        error: 'Failed to verify credential',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Grant access to credential
   * POST /api/blockchain/credentials/:id/grant-access
   */
  async grantAccess(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = grantAccessSchema.parse(req.body);

      const grant = await blockchainService.grantAccess(
        {
          credentialId: id,
          ...validatedData,
        },
        userId
      );

      res.status(201).json({
        success: true,
        grant: {
          id: grant.id,
          credentialId: grant.credentialId,
          grantedTo: grant.grantedTo,
          accessToken: grant.accessToken,
          expiresAt: grant.expiresAt,
          createdAt: grant.createdAt,
        },
      });
    } catch (error) {
      console.error('Grant access error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(500).json({
        error: 'Failed to grant access',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Revoke access to credential
   * POST /api/blockchain/credentials/:id/revoke-access
   */
  async revokeAccess(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { grantId, accessToken } = req.body;

      let revoked = false;

      if (grantId) {
        revoked = await blockchainService.revokeAccessGrant(grantId, userId);
      } else if (accessToken) {
        revoked = await blockchainService.revokeAccessByToken(accessToken, userId);
      } else {
        // Revoke all access for the credential
        const revokedCount = await blockchainService.revokeAllCredentialAccess(id, userId);
        revoked = revokedCount > 0;
      }

      res.json({
        success: true,
        revoked,
      });
    } catch (error) {
      console.error('Revoke access error:', error);
      res.status(500).json({
        error: 'Failed to revoke access',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get credential access grants
   * GET /api/blockchain/credentials/:id/grants
   */
  async getCredentialGrants(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const grants = await blockchainService.getCredentialGrants(id, userId);

      const grantList = grants.map(grant => ({
        id: grant.id,
        grantedTo: grant.grantedTo,
        expiresAt: grant.expiresAt,
        createdAt: grant.createdAt,
        revoked: grant.revoked,
        revokedAt: grant.revokedAt,
      }));

      res.json({
        success: true,
        grants: grantList,
        total: grantList.length,
      });
    } catch (error) {
      console.error('Get grants error:', error);
      res.status(500).json({
        error: 'Failed to retrieve grants',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get access logs for credential
   * GET /api/blockchain/credentials/:id/access-log
   */
  async getAccessLog(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { limit = 50, offset = 0, action, startDate, endDate } = req.query;

      const options = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const { logs, total } = await blockchainService.getCredentialAccessLogs(
        id,
        userId,
        options
      );

      res.json({
        success: true,
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          action: log.action,
          accessor: log.accessor,
          ipAddress: log.ipAddress,
          success: log.success,
          metadata: log.metadata,
        })),
        total,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          hasMore: offset + logs.length < total,
        },
      });
    } catch (error) {
      console.error('Get access log error:', error);
      res.status(500).json({
        error: 'Failed to retrieve access log',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get credential access statistics
   * GET /api/blockchain/credentials/:id/stats
   */
  async getCredentialStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const stats = await blockchainService.getCredentialAccessStats(id, userId);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Get credential stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve credential statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Access credential with token (public endpoint)
   * GET /api/blockchain/credentials/:id/access
   */
  async accessCredential(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { accessToken } = req.query;

      if (!accessToken) {
        return res.status(400).json({ error: 'Access token required' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const credentialData = await blockchainService.verifyAndAccessCredential(
        id,
        accessToken as string,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        ...credentialData,
      });
    } catch (error) {
      console.error('Access credential error:', error);
      res.status(403).json({
        error: 'Access denied',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete credential (GDPR compliance)
   * DELETE /api/blockchain/credentials/:id
   */
  async deleteCredential(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const deleted = await blockchainService.deleteCredential(id, userId);

      if (!deleted) {
        return res.status(404).json({ error: 'Credential not found' });
      }

      res.json({
        success: true,
        message: 'Credential deleted successfully',
      });
    } catch (error) {
      console.error('Delete credential error:', error);
      res.status(500).json({
        error: 'Failed to delete credential',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get blockchain network status
   * GET /api/blockchain/status
   */
  async getNetworkStatus(req: Request, res: Response) {
    try {
      const status = await blockchainClient.getNetworkStatus();

      res.json({
        success: true,
        blockchain: status,
      });
    } catch (error) {
      console.error('Get network status error:', error);
      res.status(500).json({
        error: 'Failed to get network status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const blockchainController = new BlockchainController();