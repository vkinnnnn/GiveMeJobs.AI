import { z } from 'zod';
import validator from 'validator';

/**
 * Enhanced validation schemas with comprehensive security checks
 */

// Custom validation functions
const isStrongPassword = (password: string): boolean => {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });
};

const isSafeString = (value: string): boolean => {
  // Check for common injection patterns
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(value));
};

const isValidName = (name: string): boolean => {
  // Allow letters, spaces, hyphens, apostrophes
  const namePattern = /^[a-zA-Z\s\-']+$/;
  return namePattern.test(name) && name.length >= 1 && name.length <= 100;
};

const isValidJobTitle = (title: string): boolean => {
  // Allow letters, numbers, spaces, common punctuation
  const titlePattern = /^[a-zA-Z0-9\s\-.,()&/]+$/;
  return titlePattern.test(title) && title.length >= 2 && title.length <= 200;
};

// Base schemas
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')
  .transform(email => email.toLowerCase().trim())
  .refine(email => validator.isEmail(email), 'Invalid email format');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(isStrongPassword, 
    'Password must contain at least 8 characters with uppercase, lowercase, number, and special character'
  );

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .transform(name => name.trim())
  .refine(isValidName, 'Name contains invalid characters')
  .refine(isSafeString, 'Name contains potentially dangerous content');

export const safeStringSchema = (minLength = 0, maxLength = 1000) => z
  .string()
  .min(minLength, `Must be at least ${minLength} characters`)
  .max(maxLength, `Must not exceed ${maxLength} characters`)
  .transform(str => str.trim())
  .refine(isSafeString, 'Contains potentially dangerous content');

export const jobTitleSchema = z
  .string()
  .min(2, 'Job title must be at least 2 characters')
  .max(200, 'Job title must not exceed 200 characters')
  .transform(title => title.trim())
  .refine(isValidJobTitle, 'Job title contains invalid characters')
  .refine(isSafeString, 'Job title contains potentially dangerous content');

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

export const phoneSchema = z
  .string()
  .optional()
  .refine(phone => !phone || validator.isMobilePhone(phone), 'Invalid phone number format');

export const urlSchema = z
  .string()
  .optional()
  .refine(url => !url || validator.isURL(url, { 
    protocols: ['http', 'https'],
    require_protocol: true,
  }), 'Invalid URL format');

// Authentication schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  professionalHeadline: jobTitleSchema.optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'Terms must be accepted'),
  privacyAccepted: z.boolean().refine(val => val === true, 'Privacy policy must be accepted'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  mfaToken: z.string().length(6, 'MFA token must be 6 digits').optional(),
  rememberMe: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const mfaTokenSchema = z.object({
  token: z.string().length(6, 'MFA token must be 6 digits').regex(/^\d{6}$/, 'MFA token must contain only digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// User profile schemas
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  professionalHeadline: jobTitleSchema.optional(),
  phone: phoneSchema,
  location: safeStringSchema(0, 100).optional(),
  website: urlSchema,
  bio: safeStringSchema(0, 1000).optional(),
  skills: z.array(safeStringSchema(1, 50)).max(50, 'Maximum 50 skills allowed').optional(),
  experience: z.array(z.object({
    title: jobTitleSchema,
    company: safeStringSchema(1, 100),
    location: safeStringSchema(0, 100).optional(),
    startDate: z.string().datetime('Invalid start date'),
    endDate: z.string().datetime('Invalid end date').optional(),
    current: z.boolean().optional(),
    description: safeStringSchema(0, 2000).optional(),
  })).max(20, 'Maximum 20 experience entries allowed').optional(),
  education: z.array(z.object({
    institution: safeStringSchema(1, 100),
    degree: safeStringSchema(1, 100),
    field: safeStringSchema(1, 100).optional(),
    startDate: z.string().datetime('Invalid start date'),
    endDate: z.string().datetime('Invalid end date').optional(),
    current: z.boolean().optional(),
    gpa: z.number().min(0).max(4.0).optional(),
  })).max(10, 'Maximum 10 education entries allowed').optional(),
});

// Job application schemas
export const createApplicationSchema = z.object({
  jobId: uuidSchema,
  coverLetter: safeStringSchema(0, 5000).optional(),
  customFields: z.record(z.string(), safeStringSchema(0, 1000)).optional(),
  attachments: z.array(z.object({
    fileName: safeStringSchema(1, 255),
    fileType: z.enum(['resume', 'cover_letter', 'portfolio', 'other']),
    fileUrl: z.string().url('Invalid file URL'),
  })).max(10, 'Maximum 10 attachments allowed').optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(['applied', 'reviewing', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted', 'rejected', 'withdrawn']).optional(),
  notes: safeStringSchema(0, 2000).optional(),
  interviewDate: z.string().datetime('Invalid interview date').optional(),
  followUpDate: z.string().datetime('Invalid follow-up date').optional(),
});

// Job search schemas
export const jobSearchSchema = z.object({
  query: safeStringSchema(0, 200).optional(),
  location: safeStringSchema(0, 100).optional(),
  remote: z.boolean().optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'temporary', 'internship']).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  salaryMin: z.number().min(0).max(10000000).optional(),
  salaryMax: z.number().min(0).max(10000000).optional(),
  industry: safeStringSchema(0, 100).optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  datePosted: z.enum(['today', 'week', 'month', 'all']).optional(),
  page: z.number().min(1).max(1000).optional(),
  limit: z.number().min(1).max(100).optional(),
}).refine(data => {
  if (data.salaryMin && data.salaryMax) {
    return data.salaryMin <= data.salaryMax;
  }
  return true;
}, {
  message: 'Minimum salary cannot be greater than maximum salary',
  path: ['salaryMin'],
});

// Document generation schemas
export const generateResumeSchema = z.object({
  templateId: z.string().uuid('Invalid template ID').optional(),
  jobId: z.string().uuid('Invalid job ID').optional(),
  sections: z.array(z.enum(['contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications'])).optional(),
  customization: z.object({
    theme: z.enum(['modern', 'classic', 'creative', 'minimal']).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    font: z.enum(['arial', 'helvetica', 'times', 'calibri']).optional(),
  }).optional(),
});

export const generateCoverLetterSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  templateId: z.string().uuid('Invalid template ID').optional(),
  tone: z.enum(['professional', 'friendly', 'enthusiastic', 'formal']).optional(),
  customContent: safeStringSchema(0, 2000).optional(),
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional(),
  metrics: z.array(z.enum(['applications', 'responses', 'interviews', 'offers', 'rejections'])).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date cannot be after end date',
  path: ['startDate'],
});

// Admin schemas
export const createUserSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(['user', 'moderator', 'admin']).optional(),
  isActive: z.boolean().optional(),
  sendWelcomeEmail: z.boolean().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin']),
  reason: safeStringSchema(1, 500),
});

// File upload schemas
export const fileUploadSchema = z.object({
  fileName: safeStringSchema(1, 255),
  fileType: z.enum(['resume', 'cover_letter', 'portfolio', 'profile_image', 'document']),
  description: safeStringSchema(0, 500).optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1).max(1000).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: safeStringSchema(1, 50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Query parameter schemas
export const idParamSchema = z.object({
  id: uuidSchema,
});

export const userIdParamSchema = z.object({
  userId: uuidSchema,
});

export const jobIdParamSchema = z.object({
  jobId: uuidSchema,
});

export const applicationIdParamSchema = z.object({
  applicationId: uuidSchema,
});

// Validation middleware factory
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        code: 'INVALID_REQUEST',
      });
    }
  };
};

// Query validation middleware
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse(req.query);
      req.query = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        code: 'INVALID_QUERY',
      });
    }
  };
};

// Params validation middleware
export const validateParams = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.parse(req.params);
      req.params = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid route parameters',
          code: 'INVALID_PARAMS',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid route parameters',
        code: 'INVALID_PARAMS',
      });
    }
  };
};