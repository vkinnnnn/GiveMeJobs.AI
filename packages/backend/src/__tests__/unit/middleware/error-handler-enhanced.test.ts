import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { EnhancedErrorHandler } from '../../../middleware/error-handler-enhanced.middleware';
import { 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError,
  InternalServerError 
} from '../../../types/error.types';
import { ZodError } from 'zod';
import { Logger } from 'winston';

// Mock logger
const mockLogger: Logger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
} as any;

describe('EnhancedErrorHandler', () => {
  let errorHandler: EnhancedErrorHandler;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    errorHandler = new (class extends EnhancedErrorHandler {
      constructor() {
        super();
        (this as any).logger = mockLogger;
      }
    })();

    mockReq = {
      headers: { 'x-correlation-id': 'test-correlation-id' },
      user: { id: 'user-123' },
      id: 'req-123',
      ip: '127.0.0.1',
      method: 'POST',
      originalUrl: '/api/test',
      body: { data: 'test' },
      query: { param: 'value' },
      params: { id: '123' },
      get: vi.fn().mockReturnValue('Mozilla/5.0'),
      connection: { remoteAddress: '127.0.0.1' },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('handle', () => {
    it('should handle ValidationError correctly', () => {
      // Arrange
      const validationErrors = [
        { field: 'email', message: 'Invalid email format', value: 'invalid-email' },
        { field: 'password', message: 'Password too short', value: '123' },
      ];
      const error = new ValidationError('Validation failed', validationErrors);

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          correlationId: 'test-correlation-id',
          timestamp: expect.any(String),
          validationErrors,
        }),
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            statusCode: 400,
            errorCode: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should handle NotFoundError correctly', () => {
      // Arrange
      const error = new NotFoundError('User', '123');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: "User with identifier '123' not found",
          correlationId: 'test-correlation-id',
          timestamp: expect.any(String),
        }),
      });
    });

    it('should handle UnauthorizedError correctly', () => {
      // Arrange
      const error = new UnauthorizedError('Access denied');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Access denied',
          correlationId: 'test-correlation-id',
          timestamp: expect.any(String),
        }),
      });
    });

    it('should handle InternalServerError correctly', () => {
      // Arrange
      const error = new InternalServerError('Something went wrong');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
          correlationId: 'test-correlation-id',
          timestamp: expect.any(String),
        }),
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Server error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            statusCode: 500,
            errorCode: 'INTERNAL_SERVER_ERROR',
          }),
        })
      );
    });

    it('should convert ZodError to ValidationError', () => {
      // Arrange
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
          input: 123,
        },
      ]);

      // Act
      errorHandler.handle(zodError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          validationErrors: [
            {
              field: 'email',
              message: 'Expected string, received number',
              value: 123,
            },
          ],
        }),
      });
    });

    it('should convert unknown errors to InternalServerError', () => {
      // Arrange
      const error = new Error('Unknown error');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unknown error', // In development mode
        }),
      });
    });

    it('should generate correlation ID if not present', () => {
      // Arrange
      mockReq.headers = {}; // No correlation ID
      const error = new ValidationError('Test error');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          correlationId: expect.stringMatching(/^\d+-[a-z0-9]+$/),
        }),
      });
    });

    it('should sanitize sensitive data in request body', () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'jwt-token',
        data: 'normal-data',
      };
      const error = new ValidationError('Test error');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          context: expect.objectContaining({
            body: {
              email: 'test@example.com',
              password: '[REDACTED]',
              token: '[REDACTED]',
              data: 'normal-data',
            },
          }),
        })
      );
    });

    it('should include development details in development mode', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new ValidationError('Test error');
      error.context = { additional: 'context' };

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          details: expect.objectContaining({
            stack: expect.any(String),
            context: { additional: 'context' },
          }),
        }),
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include development details in production mode', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new ValidationError('Test error');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.not.objectContaining({
          details: expect.anything(),
        }),
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('error context building', () => {
    it('should build comprehensive error context', () => {
      // Arrange
      const error = new ValidationError('Test error');

      // Act
      errorHandler.handle(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          context: expect.objectContaining({
            correlationId: 'test-correlation-id',
            userId: 'user-123',
            requestId: 'req-123',
            userAgent: 'Mozilla/5.0',
            ip: '127.0.0.1',
            method: 'POST',
            url: '/api/test',
            timestamp: expect.any(String),
            body: expect.any(Object),
            query: { param: 'value' },
            params: { id: '123' },
          }),
        })
      );
    });
  });
});