import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { IUserRepository } from '../../../repositories/user.repository';
import { Logger } from 'winston';
import { User, RegisterRequest, LoginRequest } from '../../../types/auth.types';
import * as authUtils from '../../../utils/auth.utils';

// Mock dependencies
const mockUserRepository: IUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateLastLogin: vi.fn(),
  findByResetToken: vi.fn(),
};

const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as any;

// Mock auth utils
vi.mock('../../../utils/auth.utils', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  generateTokens: vi.fn(),
  generateResetToken: vi.fn(),
}));

// Mock session manager
vi.mock('../../../config/redis-config', () => ({
  SessionManager: {
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    deleteAllUserSessions: vi.fn(),
  },
  RedisCacheService: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
  RedisKeys: {
    passwordReset: vi.fn((token) => `password_reset:${token}`),
  },
  CacheTTL: {
    TEMP_TOKEN: 900,
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUser: User;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create service instance with mocked dependencies
    authService = new (class extends AuthService {
      constructor() {
        super();
        (this as any).userRepository = mockUserRepository;
        (this as any).logger = mockLogger;
      }
      
      // Mock the createUserProfile method to avoid database calls
      private async createUserProfile(userId: string): Promise<void> {
        // Mock implementation - do nothing
        return Promise.resolve();
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

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        professionalHeadline: 'Software Developer',
      };

      const hashedPassword = '$2b$10$hashedpassword';
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

      (mockUserRepository.findByEmail as Mock).mockResolvedValue(null);
      (authUtils.hashPassword as Mock).mockResolvedValue(hashedPassword);
      (mockUserRepository.create as Mock).mockResolvedValue(mockUser);
      (authUtils.generateTokens as Mock).mockReturnValue(tokens);

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        }),
        tokens,
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(authUtils.hashPassword).toHaveBeenCalledWith(registerData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerData.email.toLowerCase(),
          password_hash: hashedPassword,
          first_name: registerData.firstName,
          last_name: registerData.lastName,
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User registered successfully',
        expect.objectContaining({ userId: mockUser.id, email: mockUser.email })
      );
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      (mockUserRepository.findByEmail as Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User registration failed',
        expect.objectContaining({ email: registerData.email })
      );
    });

    it('should handle registration errors', async () => {
      // Arrange
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const error = new Error('Database error');
      (mockUserRepository.findByEmail as Mock).mockResolvedValue(null);
      (authUtils.hashPassword as Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User registration failed',
        expect.objectContaining({ email: registerData.email, error })
      );
    });
  });

  describe('login', () => {
    it('should successfully login user with valid credentials', async () => {
      // Arrange
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

      (mockUserRepository.findByEmail as Mock).mockResolvedValue(mockUser);
      (authUtils.comparePassword as Mock).mockResolvedValue(true);
      (authUtils.generateTokens as Mock).mockReturnValue(tokens);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        }),
        tokens,
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(authUtils.comparePassword).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password_hash
      );
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logged in successfully',
        expect.objectContaining({ userId: mockUser.id, email: mockUser.email })
      );
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const loginData: LoginRequest = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      (mockUserRepository.findByEmail as Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'User login failed',
        expect.objectContaining({ email: loginData.email })
      );
    });

    it('should throw error if password is invalid', async () => {
      // Arrange
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      (mockUserRepository.findByEmail as Mock).mockResolvedValue(mockUser);
      (authUtils.comparePassword as Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );

      expect(authUtils.comparePassword).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password_hash
      );
    });
  });

  describe('findUserById', () => {
    it('should return user without password hash', async () => {
      // Arrange
      (mockUserRepository.findById as Mock).mockResolvedValue(mockUser);

      // Act
      const result = await authService.findUserById(mockUser.id);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
        })
      );
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should return null if user not found', async () => {
      // Arrange
      (mockUserRepository.findById as Mock).mockResolvedValue(null);

      // Act
      const result = await authService.findUserById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      // Arrange
      const userId = mockUser.id;
      const currentPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      const newHashedPassword = '$2b$10$newhashedpassword';

      (mockUserRepository.findById as Mock).mockResolvedValue(mockUser);
      (authUtils.comparePassword as Mock).mockResolvedValue(true);
      (authUtils.hashPassword as Mock).mockResolvedValue(newHashedPassword);

      // Act
      await authService.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(authUtils.comparePassword).toHaveBeenCalledWith(
        currentPassword,
        mockUser.password_hash
      );
      expect(authUtils.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        password_hash: newHashedPassword,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Password changed successfully',
        { userId }
      );
    });

    it('should throw error if user not found', async () => {
      // Arrange
      (mockUserRepository.findById as Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.changePassword('nonexistent-id', 'old', 'new')
      ).rejects.toThrow('User not found');
    });

    it('should throw error if current password is incorrect', async () => {
      // Arrange
      (mockUserRepository.findById as Mock).mockResolvedValue(mockUser);
      (authUtils.comparePassword as Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.changePassword(mockUser.id, 'wrong-password', 'new-password')
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});