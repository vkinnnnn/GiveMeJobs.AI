/**
 * User service tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, CreateUserRequest, UpdateUserRequest } from '../../services/user.service';
import { IUserRepository } from '../../repositories/user.repository';
import { User } from '../../types/entities.types';
import { Logger } from 'winston';
import { Result } from '../../types/result.types';
import bcrypt from 'bcrypt';

// Mock bcrypt
vi.mock('bcrypt');
const mockedBcrypt = vi.mocked(bcrypt);

// Mock dependencies
const mockUserRepository: IUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByEmailWithProfile: vi.fn(),
  updateLastLogin: vi.fn(),
  findActiveUsers: vi.fn(),
  searchUsers: vi.fn(),
  findAll: vi.fn(),
  findWithPagination: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
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

describe('UserService', () => {
  let userService: UserService;
  let mockUser: User;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create service instance with mocked dependencies
    userService = new (class extends UserService {
      constructor() {
        // Bypass dependency injection for testing
        super();
        (this as any).userRepository = mockUserRepository;
        (this as any).logger = mockLogger;
        (this as any).saltRounds = 12;
      }
    })();

    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password_hash: '$2b$12$hashedpassword',
      first_name: 'John',
      last_name: 'Doe',
      professional_headline: 'Software Engineer',
      mfa_enabled: false,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: new Date()
    };
  });

  describe('createUser', () => {
    const validUserData: CreateUserRequest = {
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      professionalHeadline: 'Product Manager'
    };

    it('should create user successfully', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockedBcrypt.hash).mockResolvedValue('$2b$12$hashedpassword' as never);
      vi.mocked(mockUserRepository.create).mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser(validUserData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(vi.mocked(mockUserRepository.findByEmail)).toHaveBeenCalledWith('new@example.com');
      expect(vi.mocked(mockedBcrypt.hash)).toHaveBeenCalledWith('Password123!', 12);
      expect(vi.mocked(mockUserRepository.create)).toHaveBeenCalledWith({
        email: 'new@example.com',
        password_hash: '$2b$12$hashedpassword',
        first_name: 'Jane',
        last_name: 'Smith',
        professional_headline: 'Product Manager',
        mfa_enabled: false
      });
      expect(vi.mocked(mockLogger.info)).toHaveBeenCalledWith('User created successfully', {
        userId: mockUser.id,
        email: mockUser.email
      });
    });

    it('should return error if user already exists', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser(validUserData);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('User with this email already exists');
      expect(vi.mocked(mockUserRepository.create)).not.toHaveBeenCalled();
    });

    it('should return validation error for invalid email', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, email: 'invalid-email' };

      // Act
      const result = await userService.createUser(invalidUserData);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toContain('Invalid email format');
      expect(vi.mocked(mockUserRepository.findByEmail)).not.toHaveBeenCalled();
    });

    it('should return validation error for weak password', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, password: 'weak' };

      // Act
      const result = await userService.createUser(invalidUserData);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toContain('Password must be at least 8 characters');
      expect(vi.mocked(mockUserRepository.findByEmail)).not.toHaveBeenCalled();
    });

    it('should return validation error for missing required fields', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, firstName: '' };

      // Act
      const result = await userService.createUser(invalidUserData);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toContain('First name is required');
    });

    it('should handle password hashing errors', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockedBcrypt.hash).mockRejectedValue(new Error('Hashing failed') as never);

      // Act
      const result = await userService.createUser(validUserData);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Failed to hash password');
      expect(vi.mocked(mockUserRepository.create)).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockedBcrypt.hash).mockResolvedValue('$2b$12$hashedpassword' as never);
      vi.mocked(mockUserRepository.create).mockRejectedValue(new Error('Database error'));

      // Act
      const result = await userService.createUser(validUserData);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Failed to create user');
      expect(vi.mocked(mockLogger.error)).toHaveBeenCalledWith('Error creating user', {
        email: validUserData.email,
        error: 'Database error',
        stack: expect.any(String)
      });
    });
  });

  describe('getUserById', () => {
    it('should return user successfully', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(vi.mocked(mockUserRepository.findById)).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return error for invalid ID', async () => {
      // Act
      const result = await userService.getUserById('');

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Invalid user ID');
      expect(vi.mocked(mockUserRepository.findById)).not.toHaveBeenCalled();
    });

    it('should return not found error if user does not exist', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(mockUser.id);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toContain('User with id');
      expect(result.error.message).toContain('not found');
    });

    it('should handle repository errors', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockRejectedValue(new Error('Database error'));

      // Act
      const result = await userService.getUserById(mockUser.id);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Failed to get user');
      expect(vi.mocked(mockLogger.error)).toHaveBeenCalledWith('Error getting user by ID', {
        userId: mockUser.id,
        error: 'Database error'
      });
    });
  });

  describe('getUserByEmail', () => {
    it('should return user successfully', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail(mockUser.email);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(vi.mocked(mockUserRepository.findByEmail)).toHaveBeenCalledWith(mockUser.email);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail('TEST@EXAMPLE.COM');

      // Assert
      expect(result.success).toBe(true);
      expect(vi.mocked(mockUserRepository.findByEmail)).toHaveBeenCalledWith('test@example.com');
    });

    it('should return error for invalid email', async () => {
      // Act
      const result = await userService.getUserByEmail('');

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Invalid email');
      expect(vi.mocked(mockUserRepository.findByEmail)).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const validUpdates: UpdateUserRequest = {
      firstName: 'Updated',
      lastName: 'Name',
      professionalHeadline: 'Senior Engineer'
    };

    it('should update user successfully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, first_name: 'Updated', last_name: 'Name' };
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepository.update).mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(mockUser.id, validUpdates);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
      expect(vi.mocked(mockUserRepository.findById)).toHaveBeenCalledWith(mockUser.id);
      expect(vi.mocked(mockUserRepository.update)).toHaveBeenCalledWith(mockUser.id, {
        first_name: 'Updated',
        last_name: 'Name',
        professional_headline: 'Senior Engineer'
      });
    });

    it('should return error if user not found', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      // Act
      const result = await userService.updateUser(mockUser.id, validUpdates);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toContain('User with id');
      expect(result.error.message).toContain('not found');
      expect(vi.mocked(mockUserRepository.update)).not.toHaveBeenCalled();
    });

    it('should check email uniqueness when updating email', async () => {
      // Arrange
      const updatesWithEmail = { ...validUpdates, email: 'newemail@example.com' };
      const existingEmailUser = { ...mockUser, id: 'different-id' };
      
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingEmailUser);

      // Act
      const result = await userService.updateUser(mockUser.id, updatesWithEmail);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Email already in use');
      expect(vi.mocked(mockUserRepository.update)).not.toHaveBeenCalled();
    });

    it('should allow updating to same email', async () => {
      // Arrange
      const updatesWithSameEmail = { ...validUpdates, email: mockUser.email };
      const updatedUser = { ...mockUser, first_name: 'Updated' };
      
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepository.update).mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(mockUser.id, updatesWithSameEmail);

      // Assert
      expect(result.success).toBe(true);
      expect(vi.mocked(mockUserRepository.findByEmail)).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      // Arrange
      vi.mocked(mockedBcrypt.compare).mockResolvedValue(true as never);

      // Act
      const result = await userService.validatePassword(mockUser, 'correctpassword');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(vi.mocked(mockedBcrypt.compare)).toHaveBeenCalledWith('correctpassword', mockUser.password_hash);
    });

    it('should return false for invalid password', async () => {
      // Arrange
      vi.mocked(mockedBcrypt.compare).mockResolvedValue(false as never);

      // Act
      const result = await userService.validatePassword(mockUser, 'wrongpassword');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should return error for invalid password input', async () => {
      // Act
      const result = await userService.validatePassword(mockUser, '');

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Invalid password');
      expect(vi.mocked(mockedBcrypt.compare)).not.toHaveBeenCalled();
    });

    it('should handle bcrypt errors', async () => {
      // Arrange
      vi.mocked(mockedBcrypt.compare).mockRejectedValue(new Error('Bcrypt error') as never);

      // Act
      const result = await userService.validatePassword(mockUser, 'password');

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Failed to validate password');
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      // Arrange
      const searchResults = [mockUser];
      vi.mocked(mockUserRepository.searchUsers).mockResolvedValue(searchResults);

      // Act
      const result = await userService.searchUsers('john', 10);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(searchResults);
      expect(vi.mocked(mockUserRepository.searchUsers)).toHaveBeenCalledWith('john', 10);
    });

    it('should return error for short query', async () => {
      // Act
      const result = await userService.searchUsers('a', 10);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Search query must be at least 2 characters');
      expect(vi.mocked(mockUserRepository.searchUsers)).not.toHaveBeenCalled();
    });

    it('should return error for invalid limit', async () => {
      // Act
      const result = await userService.searchUsers('john', 150);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('Limit must be between 1 and 100');
      expect(vi.mocked(mockUserRepository.searchUsers)).not.toHaveBeenCalled();
    });

    it('should use default limit', async () => {
      // Arrange
      vi.mocked(mockUserRepository.searchUsers).mockResolvedValue([]);

      // Act
      const result = await userService.searchUsers('john');

      // Assert
      expect(result.success).toBe(true);
      expect(vi.mocked(mockUserRepository.searchUsers)).toHaveBeenCalledWith('john', 50);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      // Act
      const result = await userService.deleteUser(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(vi.mocked(mockUserRepository.findById)).toHaveBeenCalledWith(mockUser.id);
      expect(vi.mocked(mockUserRepository.delete)).toHaveBeenCalledWith(mockUser.id);
      expect(vi.mocked(mockLogger.info)).toHaveBeenCalledWith('User deleted successfully', { userId: mockUser.id });
    });

    it('should return error if user not found', async () => {
      // Arrange
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      // Act
      const result = await userService.deleteUser(mockUser.id);

      // Assert
      expect(result.failure).toBe(true);
      expect(result.error.message).toContain('User with id');
      expect(result.error.message).toContain('not found');
      expect(vi.mocked(mockUserRepository.delete)).not.toHaveBeenCalled();
    });
  });
});