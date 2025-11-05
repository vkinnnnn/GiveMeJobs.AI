import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { container } from '../container';
import { TYPES } from '../types/container.types';

/**
 * Enhanced Security Middleware with comprehensive input validation,
 * sanitization, rate limiting, and security headers
 */
export class EnhancedSecurityMiddleware {
  private readonly redis: Redis;
  private readonly logger: Logger;

  constructor() {
    this.redis = container.get<Redis>(TYPES.Redis);
    this.logger = container.get<Logger>(TYPES.Logger);
  }

  /**
   * Comprehensive input sanitization
   */
  sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize body
      if (req.body) {
        req.body = this.deepSanitize(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = this.deepSanitize(req.query);
      }

      // Sanitize route parameters
      if (req.params) {
        req.params = this.deepSanitize(req.params);
      }

      // Sanitize headers (specific ones)
      const headersToSanitize = ['user-agent', 'referer', 'x-forwarded-for'];
      headersToSanitize.forEach(header => {
        if (req.headers[header]) {
          req.headers[header] = this.sanitizeString(req.headers[header] as string);
        }
      });

      next();
    } catch (error) {
      this.logger.error('Input sanitization failed', { 
        error: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        code: 'SANITIZATION_ERROR',
      });
    }
  };

  /**
   * SQL Injection prevention middleware
   */
  preventSQLInjection = (req: Request, res: Response, next: NextFunction): void => {
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+)|(\?)|(\[)|(\])|(\{)|(\}))/gi,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    ];

    const checkForSQLInjection = (value: any): boolean => {
      if (typeof value === 'string') {
        return sqlInjectionPatterns.some(pattern => pattern.test(value));
      }
      return false;
    };

    const hasSQLInjection = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return checkForSQLInjection(obj);
      }

      if (Array.isArray(obj)) {
        return obj.some(hasSQLInjection);
      }

      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(hasSQLInjection);
      }

      return false;
    };

    // Check body, query, and params
    if (hasSQLInjection(req.body) || hasSQLInjection(req.query) || hasSQLInjection(req.params)) {
      this.logger.warn('SQL injection attempt detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params,
      });

      res.status(400).json({
        success: false,
        error: 'Invalid input detected',
        code: 'SECURITY_VIOLATION',
      });
      return;
    }

    next();
  };

  /**
   * XSS prevention middleware
   */
  preventXSS = (req: Request, res: Response, next: NextFunction): void => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
      /<[^>]*\s(onerror|onload|onclick|onmouseover)\s*=/gi,
    ];

    const checkForXSS = (value: any): boolean => {
      if (typeof value === 'string') {
        return xssPatterns.some(pattern => pattern.test(value));
      }
      return false;
    };

    const hasXSS = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return checkForXSS(obj);
      }

      if (Array.isArray(obj)) {
        return obj.some(hasXSS);
      }

      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(hasXSS);
      }

      return false;
    };

    // Check for XSS in request data
    if (hasXSS(req.body) || hasXSS(req.query) || hasXSS(req.params)) {
      this.logger.warn('XSS attempt detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params,
      });

      res.status(400).json({
        success: false,
        error: 'Invalid input detected',
        code: 'SECURITY_VIOLATION',
      });
      return;
    }

    next();
  };

  /**
   * CSRF protection middleware
   */
  csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    // Skip CSRF for API endpoints with proper authentication
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      next();
      return;
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      this.logger.warn('CSRF token validation failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        hasToken: !!csrfToken,
        hasSessionToken: !!sessionToken,
      });

      res.status(403).json({
        success: false,
        error: 'CSRF token validation failed',
        code: 'CSRF_TOKEN_INVALID',
      });
      return;
    }

    next();
  };

  /**
   * Redis-based distributed rate limiting
   */
  createDistributedRateLimit = (options: {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = options.keyGenerator ? options.keyGenerator(req) : `rate_limit:${req.ip}`;
        const windowMs = options.windowMs;
        const maxRequests = options.max;

        // Get current count
        const current = await this.redis.incr(key);
        
        // Set expiration on first request
        if (current === 1) {
          await this.redis.expire(key, Math.ceil(windowMs / 1000));
        }

        // Get TTL for remaining time
        const ttl = await this.redis.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
        res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

        if (current > maxRequests) {
          this.logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            current,
            limit: maxRequests,
          });

          res.status(429).json({
            success: false,
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: ttl,
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Rate limiting error', { 
          error: error.message,
          ip: req.ip,
        });
        
        // Fail open - allow request if rate limiting fails
        next();
      }
    };
  };

  /**
   * User-specific rate limiting
   */
  createUserRateLimit = (options: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
  }) => {
    return this.createDistributedRateLimit({
      ...options,
      keyGenerator: (req: Request) => {
        const userId = req.jwtPayload?.userId || req.ip;
        return `rate_limit:user:${userId}`;
      },
    });
  };

  /**
   * Endpoint-specific rate limiting
   */
  createEndpointRateLimit = (options: {
    windowMs: number;
    max: number;
    endpoint: string;
  }) => {
    return this.createDistributedRateLimit({
      ...options,
      keyGenerator: (req: Request) => {
        const userId = req.jwtPayload?.userId || req.ip;
        return `rate_limit:endpoint:${options.endpoint}:${userId}`;
      },
    });
  };

  /**
   * Security headers middleware
   */
  securityHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.openai.com", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  /**
   * Request size validation
   */
  validateRequestSize = (maxSizeBytes: number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = req.get('Content-Length');
      
      if (contentLength && parseInt(contentLength) > maxSizeBytes) {
        this.logger.warn('Request size exceeded', {
          ip: req.ip,
          path: req.path,
          contentLength,
          maxSize: maxSizeBytes,
        });

        res.status(413).json({
          success: false,
          error: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: `${maxSizeBytes} bytes`,
        });
        return;
      }

      next();
    };
  };

  /**
   * File upload validation
   */
  validateFileUpload = (options: {
    allowedMimeTypes: string[];
    maxFileSize: number;
    maxFiles?: number;
  }) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.files || Object.keys(req.files).length === 0) {
        next();
        return;
      }

      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

      // Check number of files
      if (options.maxFiles && files.length > options.maxFiles) {
        res.status(400).json({
          success: false,
          error: `Too many files. Maximum ${options.maxFiles} allowed`,
          code: 'TOO_MANY_FILES',
        });
        return;
      }

      // Validate each file
      for (const file of files) {
        // Check file size
        if (file.size > options.maxFileSize) {
          res.status(400).json({
            success: false,
            error: `File too large. Maximum ${options.maxFileSize} bytes allowed`,
            code: 'FILE_TOO_LARGE',
            fileName: file.name,
          });
          return;
        }

        // Check MIME type
        if (!options.allowedMimeTypes.includes(file.mimetype)) {
          res.status(400).json({
            success: false,
            error: 'Invalid file type',
            code: 'INVALID_FILE_TYPE',
            fileName: file.name,
            allowedTypes: options.allowedMimeTypes,
          });
          return;
        }

        // Check for malicious file extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (dangerousExtensions.includes(fileExtension)) {
          res.status(400).json({
            success: false,
            error: 'Dangerous file type detected',
            code: 'DANGEROUS_FILE_TYPE',
            fileName: file.name,
          });
          return;
        }
      }

      next();
    };
  };

  /**
   * Deep sanitization of nested objects
   */
  private deepSanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Sanitize key name
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.deepSanitize(obj[key]);
        }
      }
      return sanitized;
    }

    return this.sanitizeString(obj);
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove HTML tags and sanitize
    let sanitized = DOMPurify.sanitize(value, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Additional sanitization
    sanitized = validator.escape(sanitized); // Escape HTML entities
    sanitized = sanitized.trim(); // Remove leading/trailing whitespace
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Limit length to prevent DoS
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }

    return sanitized;
  }
}

// Create singleton instance
export const enhancedSecurityMiddleware = new EnhancedSecurityMiddleware();

// Export individual middleware functions
export const {
  sanitizeInput,
  preventSQLInjection,
  preventXSS,
  csrfProtection,
  createDistributedRateLimit,
  createUserRateLimit,
  createEndpointRateLimit,
  securityHeaders,
  validateRequestSize,
  validateFileUpload,
} = enhancedSecurityMiddleware;

// Pre-configured rate limiters
export const globalRateLimit = enhancedSecurityMiddleware.createDistributedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
});

export const authRateLimit = enhancedSecurityMiddleware.createEndpointRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  endpoint: 'auth',
});

export const apiRateLimit = enhancedSecurityMiddleware.createUserRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
});

export const uploadRateLimit = enhancedSecurityMiddleware.createEndpointRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  endpoint: 'upload',
});

// File upload validators
export const documentUploadValidator = enhancedSecurityMiddleware.validateFileUpload({
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
});

export const imageUploadValidator = enhancedSecurityMiddleware.validateFileUpload({
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 10,
});