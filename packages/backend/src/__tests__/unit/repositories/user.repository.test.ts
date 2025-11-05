import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { UserRepository } from '../../../repositories/user.repository';
import { IDatabaseConnection, ICacheService } from '../../../types/repository.types';
import { User } from '../../../types/auth.types';

// Mock dependencies
const mockDb: IDatabaseConnection = {
  query: vi.fn(),
  transaction: vi.fn(),
  executePrepared: vi.fn(),
  executePreparedInTransaction: vi.fn(),
  healthCheck: vi.fn(),
  getPoolStats: vi.fn(),
};

const mockCache: ICacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidate: vi.fn(),
  exists: vi.fn(),
  getOrSet: vi.fn(),
  mget: vi.fn(),
  mset: vi.fn(),
};

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockUser: User;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create repository instance with mocked dependencies
    userRepository = new (class extends UserRepository {
      constructor() {
        super();
        (this as any).db = mockDb;
        (this as any).cache = mockCache;
        (this as any).tableName = 'users';
        (this as any).primaryKey = 'id';
        (this as any).cachePrefix = 'users:';
        (this as any).cacheTTL = 3600;
      }
    })();

    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password_hash: '$2b$10$hashedpassword',
      first_name: 'John',
      last_name: 'Doe',
      professional_headline: 'Software Developer',
      blockchain_address: null,
      mfa_enabled: false,
      mfa_secret: null,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: null,
    };
  });

  describe('findById', () => {
    it('should return user from cache if available', async () => {
      // Arrange
      (mockCache.get as Mock).mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith(`users:${mockUser.id}`);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not in cache', async () => {
      // Arrange
      (mockCache.get as Mock).mockResolvedValue(null);
      (mockDb.query as Mock).mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
      });

      // Act
      const result = await userRepository.findById(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith(`users:${mockUser.id}`);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [mockUser.id]
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        `users:${mockUser.id}`,
        mockUser,
        3600
      );
    });

    it('should return null if user not found', async () => {
      // Arrange
      (mockCache.get as Mock).mockResolvedValue(null);
      (mockDb.query as Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await userRepository.findById(mockUser.id);

      // Assert
      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user from cache if available', async () => {
      // Arrange
      const emailCacheKey = `users:email:${mockUser.email}`;
      (mockCache.get as Mock).mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCache.get).toHaveBeenCalledWith(emailCacheKey);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result if not in cache', async () => {
      // Arrange
      const emailCacheKey = `users:email:${mockUser.email}`;
      (mockCache.get as Mock).mockResolvedValue(null);
      (mockDb.query as Mock).mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
      });

      // Act
      const result = await userRepository.findByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        [mockUser.email]
      );
      expect(mockCache.set).toHaveBeenCalledWith(emailCacheKey, mockUser, 3600);
    });
  });

  describe('create', () => {
    it('should create user and invalidate cache', async () => {
      // Arrange
      const userData = {
        email: mockUser.email,
        password_hash: mockUser.password_hash,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        professional_headline: mockUser.professional_headline,
        blockchain_address: null,
        mfa_enabled: false,
        mfa_secret: null,
        last_login: null,
      };

      (mockDb.transaction as Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [mockUser], rowCount: 1 }),
        };
        return callback(mockClient);
      });

      // Act
      const result = await userRepository.create(userData);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockCache.invalidate).toHaveBeenCalledWith('users:*');
      expect(mockCache.set).toHaveBeenCalledWith(
        `users:email:${mockUser.email}`,
        mockUser,
        3600
      );
    });
  });

  describe('update', () => {
    it('should update user and update cache', async () => {
      // Arrange
      const updates = { first_name: 'Jane' };
      const updatedUser = { ...mockUser, ...updates };

      (mockDb.transaction as Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [updatedUser], rowCount: 1 }),
        };
        return callback(mockClient);
      });

      // Act
      const result = await userRepository.update(mockUser.id, updates);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockCache.set).toHaveBeenCalledWith(
        `users:${mockUser.id}`,
        updatedUser,
        3600
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('users:*');
    });

    it('should update email cache when email is changed', async () => {
      // Arrange
      const updates = { email: 'newemail@example.com' };
      const updatedUser = { ...mockUser, ...updates };

      (mockDb.transaction as Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [updatedUser], rowCount: 1 }),
        };
        return callback(mockClient);
      });

      // Act
      const result = await userRepository.update(mockUser.id, updates);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockCache.invalidate).toHaveBeenCalledWith('users:email:*');
      expect(mockCache.set).toHaveBeenCalledWith(
        `users:email:${updates.email}`,
        updatedUser,
        3600
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login and invalidate cache', async () => {
      // Arrange
      (mockDb.query as Mock).mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await userRepository.updateLastLogin(mockUser.id);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [mockUser.id]
      );
      expect(mockCache.delete).toHaveBeenCalledWith(`users:${mockUser.id}`);
    });
  });

  describe('findByResetToken', () => {
    it('should find user by reset token', async () => {
      // Arrange
      const token = 'reset-token-123';
      (mockDb.query as Mock).mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
      });

      // Act
      const result = await userRepository.findByResetToken(token);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('password_reset_tokens'),
        [token]
      );
    });

    it('should return null if token not found or expired', async () => {
      // Arrange
      const token = 'invalid-token';
      (mockDb.query as Mock).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      // Act
      const result = await userRepository.findByResetToken(token);

      // Assert
      expect(result).toBeNull();
    });
  });
});