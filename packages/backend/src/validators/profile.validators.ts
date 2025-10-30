import { z } from 'zod';

/**
 * User Preferences Schema
 */
export const userPreferencesSchema = z.object({
  jobTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship'])).optional(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']).optional(),
  locations: z.array(z.string()).optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  industries: z.array(z.string()).optional(),
  companySizes: z.array(z.string()).optional(),
});

/**
 * Update User Profile Schema
 */
export const updateProfileSchema = z.object({
  professionalHeadline: z.string().max(255).optional(),
  preferences: userPreferencesSchema.optional(),
});

/**
 * Create Skill Schema
 */
export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  proficiencyLevel: z.number().int().min(1).max(5),
  yearsOfExperience: z.number().min(0).max(99.9),
  lastUsed: z.string().datetime().optional(),
});

/**
 * Update Skill Schema
 */
export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  proficiencyLevel: z.number().int().min(1).max(5).optional(),
  yearsOfExperience: z.number().min(0).max(99.9).optional(),
  lastUsed: z.string().datetime().optional(),
});

/**
 * Create Experience Schema
 */
export const createExperienceSchema = z.object({
  company: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  current: z.boolean().default(false),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // If current is false and endDate is provided, endDate must be after startDate
    if (!data.current && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    // If current is true, endDate should not be provided
    if (data.current && data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: 'End date must be after start date, and current positions should not have an end date',
  }
);

/**
 * Update Experience Schema
 */
export const updateExperienceSchema = z.object({
  company: z.string().min(1).max(255).optional(),
  title: z.string().min(1).max(255).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

/**
 * Create Education Schema
 */
export const createEducationSchema = z.object({
  institution: z.string().min(1).max(255),
  degree: z.string().min(1).max(100),
  fieldOfStudy: z.string().max(100).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  credentialHash: z.string().optional(),
}).refine(
  (data) => {
    // If endDate is provided, it must be after startDate
    if (data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
  }
);

/**
 * Update Education Schema
 */
export const updateEducationSchema = z.object({
  institution: z.string().min(1).max(255).optional(),
  degree: z.string().min(1).max(100).optional(),
  fieldOfStudy: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  credentialHash: z.string().optional(),
});

/**
 * Create Career Goal Schema
 */
export const createCareerGoalSchema = z.object({
  targetRole: z.string().min(1).max(255),
  targetCompanies: z.array(z.string()).optional(),
  targetSalary: z.number().min(0).optional(),
  timeframe: z.string().max(100).optional(),
  requiredSkills: z.array(z.string()).optional(),
  skillGaps: z.array(z.string()).optional(),
});

/**
 * Update Career Goal Schema
 */
export const updateCareerGoalSchema = z.object({
  targetRole: z.string().min(1).max(255).optional(),
  targetCompanies: z.array(z.string()).optional(),
  targetSalary: z.number().min(0).optional(),
  timeframe: z.string().max(100).optional(),
  requiredSkills: z.array(z.string()).optional(),
  skillGaps: z.array(z.string()).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
export type CreateEducationInput = z.infer<typeof createEducationSchema>;
export type UpdateEducationInput = z.infer<typeof updateEducationSchema>;
export type CreateCareerGoalInput = z.infer<typeof createCareerGoalSchema>;
export type UpdateCareerGoalInput = z.infer<typeof updateCareerGoalSchema>;
