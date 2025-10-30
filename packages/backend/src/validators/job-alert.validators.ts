import { z } from 'zod';

export const jobAlertCriteriaSchema = z.object({
  keywords: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  jobTypes: z.array(z.string()).optional(),
  remoteTypes: z.array(z.string()).optional(),
  salaryMin: z.number().min(0).optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
});

export const createJobAlertSchema = z.object({
  name: z.string().min(1).max(255),
  criteria: jobAlertCriteriaSchema,
  frequency: z.enum(['realtime', 'daily', 'weekly']),
});

export const updateJobAlertSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  criteria: jobAlertCriteriaSchema.optional(),
  frequency: z.enum(['realtime', 'daily', 'weekly']).optional(),
  active: z.boolean().optional(),
});
