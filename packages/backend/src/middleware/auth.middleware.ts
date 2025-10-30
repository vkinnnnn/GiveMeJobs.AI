import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/auth.utils';
import { JWTPayload } from '../types/auth.types';

/**
 * Extend Express Request to include user data
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      jwtPayload?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const payload = verifyAccessToken(token);
    req.jwtPayload = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user data if token is present, but doesn't require it
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.jwtPayload = payload;
    }

    next();
  } catch (error) {
    // Token is invalid, but we don't fail the request
    next();
  }
}
