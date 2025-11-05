/**
 * Unit tests for Service Authentication Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceAuthService } from '../../services/service-auth.service';
import { Logger } from 'winston';
import { ICacheService } from '../../types/repository.types';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
} as unknown as Logger;

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidate: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue({ redis: true, memory: true })
} as unknown as ICacheService;

describe('ServiceAuthService', () => {
  let serviceAuth: ServiceAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    serviceAuth = new ServiceAuthService(mockLogger, mockCache);
  });

  describe('Service Registration', () => {
    it('should register a new service', async () => {
      const serviceData = {
        name: 'Test Service',
        description: 'A test service',
        permissions: ['test:read', 'test:write'],
        isActive: true,
        allowedOrigins: ['http://localhost:3000']
      };

      const registeredService = await serviceAuth.registerService(serviceData);

      expect(registeredService).toBeDefined();
      expect(registeredService.id).toBeDefined();
      expect(registeredService.name).toBe(serviceData.name);
      expect(registeredService.permissions).toEqual(serviceData.permissions);
      expect(registeredService.createdAt).toBeInstanceOf(Date);
    });

    it('should get registered services', async () => {
      const services = await serviceAuth.getRegisteredServices();
      
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      
      // Should include default services
      const pythonService = services.find(s => s.id === 'python-ai-service');
      expect(pythonService).toBeDefined();
    });
  });

  describe('Token Generation', () => {
    it('should generate service token for registered service', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');

      expect(token).toBeDefined();
      expect(token.accessToken).toBeDefined();
      expect(token.refreshToken).toBeDefined();
      expect(token.serviceId).toBe('python-ai-service');
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(Array.isArray(token.permissions)).toBe(true);
    });

    it('should throw error for unregistered service', async () => {
      await expect(
        serviceAuth.generateServiceToken('non-existent-service')
      ).rejects.toThrow('Service not found: non-existent-service');
    });

    it('should throw error for deactivated service', async () => {
      // First deactivate the service
      await serviceAuth.deactivateService('python-ai-service');

      await expect(
        serviceAuth.generateServiceToken('python-ai-service')
      ).rejects.toThrow('Service is deactivated: python-ai-service');
    });
  });

  describe('Token Validation', () => {
    it('should validate valid service token', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      const claims = await serviceAuth.validateServiceToken(token.accessToken);

      expect(claims).toBeDefined();
      expect(claims!.serviceId).toBe('python-ai-service');
      expect(claims!.serviceName).toBe('Python AI/ML Service');
      expect(Array.isArray(claims!.permissions)).toBe(true);
      expect(claims!.iss).toBeDefined();
      expect(claims!.aud).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const claims = await serviceAuth.validateServiceToken('invalid.token.here');
      expect(claims).toBeNull();
    });

    it('should reject token for deactivated service', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      await serviceAuth.deactivateService('python-ai-service');
      
      const claims = await serviceAuth.validateServiceToken(token.accessToken);
      expect(claims).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh valid refresh token', async () => {
      const originalToken = await serviceAuth.generateServiceToken('python-ai-service');
      const refreshedToken = await serviceAuth.refreshServiceToken(originalToken.refreshToken);

      expect(refreshedToken).toBeDefined();
      expect(refreshedToken.accessToken).not.toBe(originalToken.accessToken);
      expect(refreshedToken.serviceId).toBe(originalToken.serviceId);
      expect(refreshedToken.permissions).toEqual(originalToken.permissions);
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        serviceAuth.refreshServiceToken('invalid.refresh.token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Permission Management', () => {
    it('should update service permissions', async () => {
      const newPermissions = ['new:permission', 'another:permission'];
      
      await serviceAuth.updateServicePermissions('python-ai-service', newPermissions);
      
      const services = await serviceAuth.getRegisteredServices();
      const updatedService = services.find(s => s.id === 'python-ai-service');
      
      expect(updatedService!.permissions).toEqual(newPermissions);
    });

    it('should check if service has permission', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      const claims = await serviceAuth.validateServiceToken(token.accessToken);

      const hasPermission = serviceAuth.hasPermission(claims!, 'document:generate');
      expect(hasPermission).toBe(true);

      const hasInvalidPermission = serviceAuth.hasPermission(claims!, 'invalid:permission');
      expect(hasInvalidPermission).toBe(false);
    });

    it('should handle wildcard permissions', async () => {
      // Update service with wildcard permission
      await serviceAuth.updateServicePermissions('python-ai-service', ['*']);
      
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      const claims = await serviceAuth.validateServiceToken(token.accessToken);

      const hasAnyPermission = serviceAuth.hasPermission(claims!, 'any:permission');
      expect(hasAnyPermission).toBe(true);
    });
  });

  describe('Service Management', () => {
    it('should deactivate service', async () => {
      await serviceAuth.deactivateService('python-ai-service');
      
      const services = await serviceAuth.getRegisteredServices();
      const deactivatedService = services.find(s => s.id === 'python-ai-service');
      
      expect(deactivatedService!.isActive).toBe(false);
    });

    it('should revoke service tokens', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      await serviceAuth.revokeServiceToken('python-ai-service');
      
      // Token should no longer be valid
      const claims = await serviceAuth.validateServiceToken(token.accessToken);
      expect(claims).toBeNull();
    });

    it('should get service info', () => {
      const serviceInfo = serviceAuth.getServiceInfo('python-ai-service');
      
      expect(serviceInfo).toBeDefined();
      expect(serviceInfo!.id).toBe('python-ai-service');
      expect(serviceInfo!.name).toBe('Python AI/ML Service');
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Mock cache to throw error
      vi.mocked(mockCache.set).mockRejectedValueOnce(new Error('Cache error'));
      
      // Should not throw error
      const service = await serviceAuth.registerService({
        name: 'Cache Test Service',
        description: 'Test service for cache errors',
        permissions: ['test:read'],
        isActive: true,
        allowedOrigins: ['http://localhost']
      });

      expect(service).toBeDefined();
    });

    it('should handle token generation errors', async () => {
      // Try to generate token for non-existent service
      await expect(
        serviceAuth.generateServiceToken('non-existent')
      ).rejects.toThrow();
    });
  });
});