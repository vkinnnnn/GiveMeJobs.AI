/**
 * Authentication Types and Interfaces
 */

// User Roles
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

// System Permissions
export enum Permission {
  // User permissions
  READ_OWN_PROFILE = 'read:own:profile',
  WRITE_OWN_PROFILE = 'write:own:profile',
  DELETE_OWN_ACCOUNT = 'delete:own:account',
  
  // Job permissions
  READ_JOBS = 'read:jobs',
  SAVE_JOBS = 'save:jobs',
  
  // Application permissions
  CREATE_APPLICATION = 'create:application',
  READ_OWN_APPLICATIONS = 'read:own:applications',
  UPDATE_OWN_APPLICATIONS = 'update:own:applications',
  DELETE_OWN_APPLICATIONS = 'delete:own:applications',
  
  // Document permissions
  GENERATE_DOCUMENTS = 'generate:documents',
  READ_OWN_DOCUMENTS = 'read:own:documents',
  UPDATE_OWN_DOCUMENTS = 'update:own:documents',
  DELETE_OWN_DOCUMENTS = 'delete:own:documents',
  
  // Analytics permissions
  READ_OWN_ANALYTICS = 'read:own:analytics',
  
  // Moderator permissions
  READ_ALL_USERS = 'read:all:users',
  MODERATE_CONTENT = 'moderate:content',
  
  // Admin permissions
  MANAGE_USERS = 'manage:users',
  MANAGE_ROLES = 'manage:roles',
  READ_SYSTEM_ANALYTICS = 'read:system:analytics',
  MANAGE_SYSTEM = 'manage:system',
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  professional_headline: string | null;
  blockchain_address: string | null;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  role: UserRole;
  permissions?: Permission[]; // Optional for backward compatibility
  is_active?: boolean; // Optional for backward compatibility
  email_verified?: boolean; // Optional for backward compatibility
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  mfaVerified?: boolean;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenData {
  userId: string;
  email: string;
  sessionId: string;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  mfaVerified?: boolean;
  oauthProvider?: string;
}

export interface OAuthProvider {
  id: string;
  user_id: string;
  provider: 'linkedin' | 'google' | 'github' | 'microsoft';
  provider_id: string;
  access_token: string;
  refresh_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthProfile {
  provider: 'linkedin' | 'google' | 'github' | 'microsoft';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  professionalHeadline?: string;
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  professionalHeadline?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerifyRequest {
  token: string;
}

export interface MFASetupRequest {
  password: string;
}

export interface MFADisableRequest {
  password: string;
  token: string;
}

// Legacy interfaces for backward compatibility
export interface MFAEnrollmentResponse extends MFASetupResponse {}
export interface MFAVerificationRequest extends MFAVerifyRequest {}
