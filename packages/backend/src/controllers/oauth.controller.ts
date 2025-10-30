import { Request, Response } from 'express';
import passport from '../config/passport.config';

/**
 * OAuth Controller
 * Handles OAuth authentication flows
 */
export class OAuthController {
  /**
   * Initiate Google OAuth flow
   * GET /api/auth/oauth/google
   */
  googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  });

  /**
   * Google OAuth callback
   * GET /api/auth/oauth/google/callback
   */
  googleCallback = [
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    }),
    (req: Request, res: Response) => {
      try {
        const result = req.user as any;

        // Redirect to frontend with tokens
        const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
        redirectUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
        redirectUrl.searchParams.set('isNewUser', result.isNewUser.toString());

        res.redirect(redirectUrl.toString());
      } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    },
  ];

  /**
   * Initiate LinkedIn OAuth flow
   * GET /api/auth/oauth/linkedin
   */
  linkedinAuth = passport.authenticate('linkedin', {
    scope: ['r_emailaddress', 'r_liteprofile'],
    session: false,
  });

  /**
   * LinkedIn OAuth callback
   * GET /api/auth/oauth/linkedin/callback
   */
  linkedinCallback = [
    passport.authenticate('linkedin', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    }),
    (req: Request, res: Response) => {
      try {
        const result = req.user as any;

        // Redirect to frontend with tokens
        const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
        redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
        redirectUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
        redirectUrl.searchParams.set('isNewUser', result.isNewUser.toString());

        res.redirect(redirectUrl.toString());
      } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    },
  ];
}
