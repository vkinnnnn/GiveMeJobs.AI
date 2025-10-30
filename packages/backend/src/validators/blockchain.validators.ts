import { z } from 'zod';

export const storeCredentialSchema = z.object({
  body: z.object({
    credentialType: z.enum(['degree', 'certification', 'transcript', 'license']),
    credentialData: z.object({
      title: z.string().min(1, 'Title is required'),
      issuer: z.string().min(1, 'Issuer is required'),
      issueDate: z.string().or(z.date()).transform(val => new Date(val)),
      expiryDate: z.string().or(z.date()).transform(val => new Date(val)).optional(),
      details: z.record(z.any()),
    }),
  }),
});

export const grantAccessSchema = z.object({
  body: z.object({
    grantedTo: z.string().min(1, 'Recipient identifier is required'),
    expiresInDays: z.number().int().min(1).max(365).default(30),
    purpose: z.string().optional(),
  }),
});

export const revokeAccessSchema = z.object({
  body: z.object({
    grantId: z.string().uuid().optional(),
    accessToken: z.string().optional(),
  }).refine(
    data => data.grantId || data.accessToken,
    { message: 'Either grantId or accessToken must be provided' }
  ),
});

export const accessLogQuerySchema = z.object({
  query: z.object({
    limit: z.string().transform(val => parseInt(val)).optional(),
    offset: z.string().transform(val => parseInt(val)).optional(),
    action: z.enum(['granted', 'accessed', 'revoked', 'verification_requested', 'verification_completed']).optional(),
    startDate: z.string().transform(val => new Date(val)).optional(),
    endDate: z.string().transform(val => new Date(val)).optional(),
  }),
});

export const accessCredentialQuerySchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Access token is required'),
  }),
});
