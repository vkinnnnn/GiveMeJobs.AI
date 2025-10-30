export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  professionalHeadline?: string;
}

export interface OAuthProvider {
  provider: 'linkedin' | 'google';
  providerId: string;
  accessToken: string;
  refreshToken?: string;
}
