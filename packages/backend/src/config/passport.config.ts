import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { OAuthService, OAuthProfile } from '../services/oauth.service';

const oauthService = new OAuthService();

/**
 * Google OAuth Strategy (only if credentials are provided)
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.API_URL}/api/auth/oauth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            accessToken,
            refreshToken,
          };

          const result = await oauthService.authenticateWithOAuth(oauthProfile);
          done(null, result);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set');
}

/**
 * LinkedIn OAuth Strategy (only if credentials are provided)
 */
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL || `${process.env.API_URL}/api/auth/oauth/linkedin/callback`,
        scope: ['r_emailaddress', 'r_liteprofile'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            provider: 'linkedin',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            professionalHeadline: profile._json?.headline,
            accessToken,
            refreshToken,
          };

          const result = await oauthService.authenticateWithOAuth(oauthProfile);
          done(null, result);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
} else {
  console.warn('LinkedIn OAuth not configured - LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET not set');
}

/**
 * Serialize user for session
 */
passport.serializeUser((user: any, done) => {
  done(null, user);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
