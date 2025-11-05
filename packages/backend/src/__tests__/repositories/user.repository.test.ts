/**
 * User repository tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../../repositories/user.repository';
import { User } from '../../types/entities.types';
import { IDatabaseConnection, ICacheService } from '../../types/repository.types';
import { Logger } from 'winston';

// Mock dependencies
const mockDb: IDatabaseConnection = {
  query: vi.fn(),
  transaction: vi.fn()
};

const mockCache: ICacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidate: vi.fn(),
  exists: vi.fn()
};

const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  verbose: vi.fn(),
  silly: vi.fn(),
  log: vi.fn(),
  // Add other winston methods that might be called
  child: vi.fn(() => mockLogger),
  close: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  startTimer: vi.fn(),
  profile: vi.fn(),
  configure: vi.fn(),
  query: vi.fn(),
  stream: vi.fn(),
  exceptions: {} as any,
  rejections: {} as any,
  profilers: {} as any,
  format: {} as any,
  level: 'info',
  levels: {} as any,
  transports: [] as any,
  exitOnError: true,
  silent: false,
  defaultMeta: {} as any
} as Logger;

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockUser: User;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create repository instance with mocked dependencies
    userRepository = new (class extends UserRepository {
      constructor() {
        // Bypass dependency injection for testing
        super();
        (this as any).db = mockDb;
        (this as any).cache = mockCache;
        (this as any).logger = mockLogger;
        (this as any).tableName = 'users';
        (this as any).primaryKey = 'id';
      }
    })();

    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'John',
      last_name: 'Doe',
      professional_headline: 'Software Engineer',
      mfa_enabled: false,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: new Date()
    };
  });

  describe('findById', () => {
    it('should return user from cache if available', async () => {
      // Arrange
      vi.mocked(mockCache.get).mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith('users:id:123e4567-e89b-12d3-a456-426614174000');
      expect(mockDb.query).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit for findById', {
        tableName: 'users',
        id: mockUser.id
      });
    });

    it('should query database and cache result if not in cache', async () => {
      // Arrange
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      // Act
      const result = await userRepository.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith('users:id:123e4567-e89b-12d3-a456-426614174000');
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [mockUser.id]);
      expect(mockCache.set).toHaveBeenCalledWith('users:id:123e4567-e89b-12d3-a456-426614174000', mockUser, 3600);
    });

    it('should return null if user not found', async () => {
      // Arrange
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await userRepository.findById(mockUser.id);

      // Assert
      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockDb.query).mockRejectedValue(error);

      // Act & Assert
      await expect(userRepository.findById(mockUser.id)).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error in findById', {
        tableName: 'users',
        id: mockUser.id,
        error: error.message
      });
    });
  });

  describe('findByEmail', () => {
    it('should return user by email from cache', async () => {
      // Arrange
      vi.mocked(mockCache.get).mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith('users:email:test@example.com');
    });

    it('should query database if not in cache', async () => {
      // Arrange
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [mockUser], rowCount: 1 });

      // Act
      const result = await userRepository.findByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', [mockUser.email]);
      expect(mockCache.set).toHaveBeenCalledWith('users:email:test@example.com', mockUser, 3600);
    });

    it('should return null if user not found by email', async () => {
      // Arrange
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await userRepository.findByEmail(mockUser.email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user and invalidate cache', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        professional_headline: 'Product Manager',
        mfa_enabled: false
      };

      const createdUser = { ...userData, id: 'new-id', created_at: new Date(), updated_at: new Date() };
      mockDb.query.mockResolvedValue({ rows: [createdUser], rowCount: 1 });

      // Act
      const result = await userRepository.create(userData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        Object.values(userData)
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('users:*');
      expect(mockLogger.info).toHaveBeenCalledWith('User created successfully', {
        userId: 'new-id',
        email: 'new@example.com'
      });
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const userData = {
        email: 'NEW@EXAMPLE.COM',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        mfa_enabled: false
      };

      const createdUser = { 
        ...userData, 
        email: 'new@example.com', 
        id: 'new-id', 
        created_at: new Date(), 
        updated_at: new Date() 
      };
      mockDb.query.mockResolvedValue({ rows: [createdUser], rowCount: 1 });

      // Act
      const result = await userRepository.create(userData);

      // Assert
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('update', () => {
    it('should update user and refresh cache', async () => {
      // Arrange
      const updates = { first_name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updates };
      mockDb.query.mockResolvedValue({ rows: [updatedUser], rowCount: 1 });

      // Act
      const result = await userRepository.update(mockUser.id, updates);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [mockUser.id, 'Updated Name']
      );
      expect(mockCache.set).toHaveBeenCalledWith('users:id:123e4567-e89b-12d3-a456-426614174000', updatedUser, 3600);
      expect(mockCache.invalidate).toHaveBeenCalledWith('users:*');
    });

    it('should throw error if user not found for update', async () => {
      // Arrange
      const updates = { first_name: 'Updated Name' };
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act & Assert
      await expect(userRepository.update(mockUser.id, updates)).rejects.toThrow('Entity with id 123e4567-e89b-12d3-a456-426614174000 not found');
    });
  });

  describe('delete', () => {
    it('should delete user and remove from cache', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      const result = await userRepository.delete(mockUser.id);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [mockUser.id]);
      expect(mockCache.delete).toHaveBeenCalledWith('users:id:123e4567-e89b-12d3-a456-426614174000');
      expect(mockCache.invalidate).toHaveBeenCalledWith('users:*');
    });

    it('should return false if user not found for deletion', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await userRepository.delete(mockUser.id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('searchUsers', () => {
    it('should search users with ILIKE pattern', async () => {
      // Arrange
      const searchQuery = 'john';
      const searchResults = [mockUser];
      mockDb.query.mockResolvedValue({ rows: searchResults, rowCount: 1 });

      // Act
      const result = await userRepository.searchUsers(searchQuery, 10);

      // Assert
      expect(result).toEqual(searchResults);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%john%', 10]
      );
    });

    it('should limit search results', async () => {
      // Arrange
      const searchQuery = 'test';
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      await userRepository.searchUsers(searchQuery, 25);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['%test%', 25]
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      // Arrange
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await userRepository.updateLastLogin(mockUser.id);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [mockUser.id]
      );
      expect(mockCache.delete).toHaveBeenCalledWith('users:id:123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('exists', () => {
    it('should return true if user exists', async () => {
      // Arrange
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 });

      // Act
      const result = await userRepository.exists(mockUser.id);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM users WHERE id = $1 LIMIT 1',
        [mockUser.id]
      );
    });

    it('should return false if user does not exist', async () => {
      // Arrange
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await userRepository.exists(mockUser.id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of users', async () => {
      // Arrange
      vi.mocked(mockDb.query).mockResolvedValue({ rows: [{ count: '5' }], rowCount: 1 });

      // Act
      const result = await userRepository.count();

      // Assert
      expect(result).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users',
        []
      );
    });
  });
});