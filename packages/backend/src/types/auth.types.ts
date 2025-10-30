/**
 * Authentication Types and Interfaces
 */

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
  role: 'user' | 'moderator' | 'admin';
  permissions: string[];
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
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface OAuthProvider {
  id: string;
  user_id: string;
  provider: 'linkedin' | 'google';
  provider_id: string;
  access_token: string;
  refresh_token: string | null;
  created_at: Date;
  updated_at: Date;
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

export interface PasswordResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

export interface SessionData {
  userId: string;
  email: string;
  createdAt: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MFAEnrollmentResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerificationRequest {
  token: string;
}

export interface MFASetupRequest {
  token: string;
}
