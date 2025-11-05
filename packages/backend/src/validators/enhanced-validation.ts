import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/error.types';

// Enhanced validation schemas with detailed error messages
export const createUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Please provide a valid email address')
    .min(1, 'Email cannot be empty')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  
  firstName: z
    .string({
      required_error: 'First name is required',
      invalid_type_error: 'First name must be a string',
    })
    .min(1, 'First name cannot be empty')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  
  lastName: z
    .string({
      required_error: 'Last name is required',
      invalid_type_error: 'Last name must be a string',
    })
    .min(1, 'Last name cannot be empty')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  
  professionalHeadline: z
    .string()
    .max(200, 'Professional headline must be less than 200 characters')
    .trim()
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(1, 'Password cannot be empty'),
});

export const updateProfileSchema = z.object({
  professionalHeadline: z
    .string()
    .max(200, 'Professional headline must be less than 200 characters')
    .trim()
    .optional(),
  
  preferences: z
    .object({
      jobTypes: z
        .array(z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']))
        .optional(),
      
      remotePreference: z
        .enum(['remote', 'hybrid', 'onsite', 'any'])
        .optional(),
      
      locations: z
        .array(z.string().max(100, 'Location must be less than 100 characters'))
        .max(10, 'Maximum 10 preferred locations allowed')
        .optional(),
      
      salaryMin: z
        .number()
        .min(0, 'Minimum salary must be non-negative')
        .max(10000000, 'Minimum salary seems unrealistic')
        .optional(),
      
      salaryMax: z
        .number()
        .min(0, 'Maximum salary must be non-negative')
        .max(10000000, 'Maximum salary seems unrealistic')
        .optional(),
      
      industries: z
        .array(z.string().max(50, 'Industry name must be less than 50 characters'))
        .max(20, 'Maximum 20 industries allowed')
        .optional(),
      
      companySizes: z
        .array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise']))
        .optional(),
    })
    .refine(
      (data) => !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
      {
        message: 'Minimum salary cannot be greater than maximum salary',
        path: ['salaryMin'],
      }
    )
    .optional(),
});

export const createApplicationSchema = z.object({
  job_id: z
    .string({
      required_error: 'Job ID is required',
      invalid_type_error: 'Job ID must be a string',
    })
    .uuid('Job ID must be a valid UUID'),
  
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),
  
  resume_version: z
    .string()
    .max(100, 'Resume version must be less than 100 characters')
    .trim()
    .optional(),
  
  cover_letter: z
    .string()
    .max(5000, 'Cover letter must be less than 5000 characters')
    .trim()
    .optional(),
});

export const updateApplicationSchema = z.object({
  status: z
    .enum(['pending', 'viewed', 'interview_scheduled', 'interview_completed', 'rejected', 'accepted', 'withdrawn'])
    .optional(),
  
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),
  
  interview_date: z
    .string()
    .datetime('Interview date must be a valid ISO datetime')
    .optional()
    .or(z.date()),
  
  follow_up_date: z
    .string()
    .datetime('Follow-up date must be a valid ISO datetime')
    .optional()
    .or(z.date()),
  
  interview_feedback: z
    .string()
    .max(2000, 'Interview feedback must be less than 2000 characters')
    .trim()
    .optional(),
  
  rejection_reason: z
    .string()
    .max(500, 'Rejection reason must be less than 500 characters')
    .trim()
    .optional(),
});

export const jobSearchSchema = z.object({
  keywords: z
    .string()
    .max(200, 'Keywords must be less than 200 characters')
    .trim()
    .optional(),
  
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),
  
  remoteType: z
    .array(z.enum(['remote', 'hybrid', 'onsite']))
    .max(3, 'Maximum 3 remote types allowed')
    .optional(),
  
  jobType: z
    .array(z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']))
    .max(5, 'Maximum 5 job types allowed')
    .optional(),
  
  salaryMin: z
    .number()
    .min(0, 'Minimum salary must be non-negative')
    .max(10000000, 'Minimum salary seems unrealistic')
    .optional(),
  
  salaryMax: z
    .number()
    .min(0, 'Maximum salary must be non-negative')
    .max(10000000, 'Maximum salary seems unrealistic')
    .optional(),
  
  postedWithin: z
    .number()
    .min(1, 'Posted within must be at least 1 day')
    .max(365, 'Posted within cannot exceed 365 days')
    .optional(),
  
  page: z
    .number()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .default(1),
  
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
}).refine(
  (data) => !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
  {
    message: 'Minimum salary cannot be greater than maximum salary',
    path: ['salaryMin'],
  }
);

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationErrors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));

        throw new ValidationError(
          'Request validation failed',
          validationErrors,
          {
            correlationId: req.headers['x-correlation-id'],
            path: req.path,
            method: req.method,
          }
        );
      }

      // Replace req.body with validated and transformed data
      req.body = validationResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Query parameter validation middleware
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.query);
      
      if (!validationResult.success) {
        const validationErrors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));

        throw new ValidationError(
          'Query parameter validation failed',
          validationErrors,
          {
            correlationId: req.headers['x-correlation-id'],
            path: req.path,
            method: req.method,
          }
        );
      }

      // Replace req.query with validated and transformed data
      req.query = validationResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Parameter validation middleware
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.params);
      
      if (!validationResult.success) {
        const validationErrors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));

        throw new ValidationError(
          'URL parameter validation failed',
          validationErrors,
          {
            correlationId: req.headers['x-correlation-id'],
            path: req.path,
            method: req.method,
          }
        );
      }

      // Replace req.params with validated and transformed data
      req.params = validationResult.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common parameter schemas
export const uuidParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(1000))
    .default('1'),
  
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .default('20'),
});