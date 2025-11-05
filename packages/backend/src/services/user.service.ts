/**
 * User service implementation with dependency injection
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import { IUserRepository } from '../repositories/user.repository';
import { User, UserProfile } from '../types/entities.types';
import { 
  Result, 
  ServiceResult, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  ServiceError 
} from '../types/result.types';
import bcrypt from 'bcrypt';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  professionalHeadline?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  professionalHeadline?: string;
  email?: string;
}

export interface UserWithProfile extends User {
  profile?: UserProfile;
}

export interface IUserService {
  createUser(userData: CreateUserRequest): Promise<ServiceResult<User>>;
  getUserById(id: string): Promise<ServiceResult<User>>;
  getUserByEmail(email: string): Promise<ServiceResult<User>>;
  getUserWithProfile(email: string): Promise<ServiceResult<UserWithProfile>>;
  updateUser(id: string, updates: UpdateUserRequest): Promise<ServiceResult<User>>;
  deleteUser(id: string): Promise<ServiceResult<boolean>>;
  validatePassword(user: User, password: string): Promise<ServiceResult<boolean>>;
  updateLastLogin(id: string): Promise<ServiceResult<void>>;
  searchUsers(query: string, limit?: number): Promise<ServiceResult<User[]>>;
}

@injectable()
export class UserService implements IUserService {
  private readonly saltRounds = 12;

  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createUser(userData: CreateUserRequest): Promise<ServiceResult<User>> {
    try {
      // Validate input
      const validationResult = this.validateCreateUserRequest(userData);
      if (validationResult.failure) {
        return Result.error(new ServiceError(
          'Validation failed',
          'VALIDATION_ERROR',
          validationResult.error
        ));
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        return Result.error(new ConflictError(
          'User with this email already exists',
          'email'
        ));
      }

      // Hash password
      const passwordHashResult = await this.hashPassword(userData.password);
      if (passwordHashResult.failure) {
        return Result.error(new ServiceError(
          'Failed to hash password',
          'PASSWORD_HASH_ERROR',
          passwordHashResult.error
        ));
      }

      // Create user
      const userToCreate = {
        email: userData.email.toLowerCase().trim(),
        password_hash: passwordHashResult.data,
        first_name: userData.firstName.trim(),
        last_name: userData.lastName.trim(),
        professional_headline: userData.professionalHeadline?.trim(),
        mfa_enabled: false
      };

      const user = await this.userRepository.create(userToCreate);

      this.logger.info('User created successfully', {
        userId: user.id,
        email: user.email
      });

      return Result.success(user);

    } catch (error) {
      this.logger.error('Error creating user', {
        email: userData.email,
        error: error.message,
        stack: error.stack
      });

      return Result.error(new ServiceError(
        'Failed to create user',
        'CREATE_USER_ERROR',
        error
      ));
    }
  }

  async getUserById(id: string): Promise<ServiceResult<User>> {
    try {
      if (!id || typeof id !== 'string') {
        return Result.error(new ValidationError('Invalid user ID'));
      }

      const user = await this.userRepository.findById(id);
      
      if (!user) {
        return Result.error(new NotFoundError('User', id));
      }

      return Result.success(user);

    } catch (error) {
      this.logger.error('Error getting user by ID', {
        userId: id,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to get user',
        'GET_USER_ERROR',
        error
      ));
    }
  }

  async getUserByEmail(email: string): Promise<ServiceResult<User>> {
    try {
      if (!email || typeof email !== 'string') {
        return Result.error(new ValidationError('Invalid email'));
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.userRepository.findByEmail(normalizedEmail);
      
      if (!user) {
        return Result.error(new NotFoundError('User'));
      }

      return Result.success(user);

    } catch (error) {
      this.logger.error('Error getting user by email', {
        email,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to get user',
        'GET_USER_ERROR',
        error
      ));
    }
  }

  async getUserWithProfile(email: string): Promise<ServiceResult<UserWithProfile>> {
    try {
      if (!email || typeof email !== 'string') {
        return Result.error(new ValidationError('Invalid email'));
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.userRepository.findByEmailWithProfile(normalizedEmail);
      
      if (!user) {
        return Result.error(new NotFoundError('User'));
      }

      return Result.success(user);

    } catch (error) {
      this.logger.error('Error getting user with profile', {
        email,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to get user with profile',
        'GET_USER_PROFILE_ERROR',
        error
      ));
    }
  }

  async updateUser(id: string, updates: UpdateUserRequest): Promise<ServiceResult<User>> {
    try {
      if (!id || typeof id !== 'string') {
        return Result.error(new ValidationError('Invalid user ID'));
      }

      // Validate updates
      const validationResult = this.validateUpdateUserRequest(updates);
      if (validationResult.failure) {
        return Result.error(new ServiceError(
          'Validation failed',
          'VALIDATION_ERROR',
          validationResult.error
        ));
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return Result.error(new NotFoundError('User', id));
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email !== existingUser.email) {
        const emailUser = await this.userRepository.findByEmail(updates.email);
        if (emailUser) {
          return Result.error(new ConflictError(
            'Email already in use',
            'email'
          ));
        }
      }

      // Prepare updates
      const userUpdates: Partial<User> = {};
      
      if (updates.firstName) {
        userUpdates.first_name = updates.firstName.trim();
      }
      
      if (updates.lastName) {
        userUpdates.last_name = updates.lastName.trim();
      }
      
      if (updates.professionalHeadline !== undefined) {
        userUpdates.professional_headline = updates.professionalHeadline?.trim() || null;
      }
      
      if (updates.email) {
        userUpdates.email = updates.email.toLowerCase().trim();
      }

      const updatedUser = await this.userRepository.update(id, userUpdates);

      this.logger.info('User updated successfully', {
        userId: id,
        updatedFields: Object.keys(userUpdates)
      });

      return Result.success(updatedUser);

    } catch (error) {
      this.logger.error('Error updating user', {
        userId: id,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to update user',
        'UPDATE_USER_ERROR',
        error
      ));
    }
  }

  async deleteUser(id: string): Promise<ServiceResult<boolean>> {
    try {
      if (!id || typeof id !== 'string') {
        return Result.error(new ValidationError('Invalid user ID'));
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return Result.error(new NotFoundError('User', id));
      }

      const deleted = await this.userRepository.delete(id);

      this.logger.info('User deleted successfully', { userId: id });

      return Result.success(deleted);

    } catch (error) {
      this.logger.error('Error deleting user', {
        userId: id,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to delete user',
        'DELETE_USER_ERROR',
        error
      ));
    }
  }

  async validatePassword(user: User, password: string): Promise<ServiceResult<boolean>> {
    try {
      if (!password || typeof password !== 'string') {
        return Result.error(new ValidationError('Invalid password'));
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      return Result.success(isValid);

    } catch (error) {
      this.logger.error('Error validating password', {
        userId: user.id,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to validate password',
        'PASSWORD_VALIDATION_ERROR',
        error
      ));
    }
  }

  async updateLastLogin(id: string): Promise<ServiceResult<void>> {
    try {
      if (!id || typeof id !== 'string') {
        return Result.error(new ValidationError('Invalid user ID'));
      }

      await this.userRepository.updateLastLogin(id);

      this.logger.debug('Last login updated', { userId: id });

      return Result.success(undefined);

    } catch (error) {
      this.logger.error('Error updating last login', {
        userId: id,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to update last login',
        'UPDATE_LAST_LOGIN_ERROR',
        error
      ));
    }
  }

  async searchUsers(query: string, limit: number = 50): Promise<ServiceResult<User[]>> {
    try {
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return Result.error(new ValidationError('Search query must be at least 2 characters'));
      }

      if (limit < 1 || limit > 100) {
        return Result.error(new ValidationError('Limit must be between 1 and 100'));
      }

      const users = await this.userRepository.searchUsers(query.trim(), limit);

      return Result.success(users);

    } catch (error) {
      this.logger.error('Error searching users', {
        query,
        error: error.message
      });

      return Result.error(new ServiceError(
        'Failed to search users',
        'SEARCH_USERS_ERROR',
        error
      ));
    }
  }

  // Private helper methods
  private validateCreateUserRequest(userData: CreateUserRequest): Result<void, ValidationError> {
    const errors: string[] = [];

    if (!userData.email || typeof userData.email !== 'string') {
      errors.push('Email is required');
    } else if (!this.isValidEmail(userData.email)) {
      errors.push('Invalid email format');
    }

    if (!userData.password || typeof userData.password !== 'string') {
      errors.push('Password is required');
    } else if (!this.isValidPassword(userData.password)) {
      errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    if (!userData.firstName || typeof userData.firstName !== 'string' || userData.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!userData.lastName || typeof userData.lastName !== 'string' || userData.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (userData.professionalHeadline && userData.professionalHeadline.length > 255) {
      errors.push('Professional headline must be less than 255 characters');
    }

    if (errors.length > 0) {
      return Result.error(new ValidationError(errors.join(', ')));
    }

    return Result.success(undefined);
  }

  private validateUpdateUserRequest(updates: UpdateUserRequest): Result<void, ValidationError> {
    const errors: string[] = [];

    if (updates.email !== undefined) {
      if (!updates.email || typeof updates.email !== 'string') {
        errors.push('Email must be a valid string');
      } else if (!this.isValidEmail(updates.email)) {
        errors.push('Invalid email format');
      }
    }

    if (updates.firstName !== undefined) {
      if (!updates.firstName || typeof updates.firstName !== 'string' || updates.firstName.trim().length === 0) {
        errors.push('First name cannot be empty');
      }
    }

    if (updates.lastName !== undefined) {
      if (!updates.lastName || typeof updates.lastName !== 'string' || updates.lastName.trim().length === 0) {
        errors.push('Last name cannot be empty');
      }
    }

    if (updates.professionalHeadline !== undefined && updates.professionalHeadline && updates.professionalHeadline.length > 255) {
      errors.push('Professional headline must be less than 255 characters');
    }

    if (errors.length > 0) {
      return Result.error(new ValidationError(errors.join(', ')));
    }

    return Result.success(undefined);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    // At least 8 characters, with uppercase, lowercase, number, and special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private async hashPassword(password: string): Promise<Result<string, Error>> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return Result.success(hash);
    } catch (error) {
      return Result.error(error);
    }
  }
}