/**
 * Container integration tests
 */

import { container, initializeContainer, shutdownContainer } from '../../container/container';
import { TYPES } from '../../types/container.types';
import { IUserService } from '../../services/user.service';
import { IUserRepository } from '../../repositories/user.repository';
import { ICacheService } from '../../types/repository.types';
import { Logger } from 'winston';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

describe('Container Integration', () => {
  describe('Service Resolution', () => {
    it('should resolve UserService with all dependencies', () => {
      // Act
      const userService = container.get<IUserService>(TYPES.UserService);

      // Assert
      expect(userService).toBeDefined();
      expect(typeof userService.createUser).toBe('function');
      expect(typeof userService.getUserById).toBe('function');
      expect(typeof userService.getUserByEmail).toBe('function');
    });

    it('should resolve UserRepository with dependencies', () => {
      // Act
      const userRepository = container.get<IUserRepository>(TYPES.UserRepository);

      // Assert
      expect(userRepository).toBeDefined();
      expect(typeof userRepository.findById).toBe('function');
      expect(typeof userRepository.findByEmail).toBe('function');
      expect(typeof userRepository.create).toBe('function');
    });

    it('should resolve CacheService', () => {
      // Act
      const cacheService = container.get<ICacheService>(TYPES.CacheService);

      // Assert
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
      expect(typeof cacheService.delete).toBe('function');
    });

    it('should resolve Logger', () => {
      // Act
      const logger = container.get<Logger>(TYPES.Logger);

      // Assert
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should return same instance for singleton services', () => {
      // Act
      const userService1 = container.get<IUserService>(TYPES.UserService);
      const userService2 = container.get<IUserService>(TYPES.UserService);

      // Assert
      expect(userService1).toBe(userService2);
    });

    it('should inject dependencies correctly', () => {
      // Act
      const userService = container.get<IUserService>(TYPES.UserService);
      const userRepository = container.get<IUserRepository>(TYPES.UserRepository);

      // Assert
      expect(userService).toBeDefined();
      expect(userRepository).toBeDefined();
      
      // Verify that the service has the repository injected
      // Note: This is a bit of a hack to test private dependencies
      const serviceRepo = (userService as any).userRepository;
      expect(serviceRepo).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should have database configuration', () => {
      // Act
      const dbConfig = container.get(TYPES.DatabaseConfig);

      // Assert
      expect(dbConfig).toBeDefined();
      expect(dbConfig.host).toBe('localhost');
      expect(dbConfig.port).toBe(5432);
      expect(dbConfig.database).toBe('test_db');
    });

    it('should validate required services are bound', () => {
      // Assert
      expect(container.isBound(TYPES.UserService)).toBe(true);
      expect(container.isBound(TYPES.UserRepository)).toBe(true);
      expect(container.isBound(TYPES.CacheService)).toBe(true);
      expect(container.isBound(TYPES.DatabaseConnection)).toBe(true);
      expect(container.isBound(TYPES.Logger)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unbound service', () => {
      // Act & Assert
      expect(() => {
        container.get(Symbol.for('UnboundService'));
      }).toThrow();
    });
  });

  // Note: These tests would require actual database/Redis connections
  // In a real environment, you'd use test containers or mock the connections
  describe.skip('Initialization', () => {
    it('should initialize container successfully', async () => {
      // Act & Assert
      await expect(initializeContainer()).resolves.not.toThrow();
    });

    it('should shutdown container gracefully', async () => {
      // Act & Assert
      await expect(shutdownContainer()).resolves.not.toThrow();
    });
  });
});