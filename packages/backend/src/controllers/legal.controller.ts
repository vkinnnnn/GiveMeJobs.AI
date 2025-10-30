import { Request, Response } from 'express';
import { consentService } from '../services/consent.service';
import logger from '../services/logger.service';

// Current versions of legal documents
const CURRENT_VERSIONS = {
  terms_of_service: '1.0.0',
  privacy_policy: '1.0.0',
};

export class LegalController {
  /**
   * Get privacy policy
   */
  async getPrivacyPolicy(req: Request, res: Response): Promise<void> {
    try {
      const privacyPolicy = {
        version: CURRENT_VERSIONS.privacy_policy,
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        content: {
          introduction: `GiveMeJobs ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.`,
          
          informationWeCollect: {
            title: 'Information We Collect',
            sections: [
              {
                title: 'Personal Information',
                content: 'We collect personal information that you provide to us, including: name, email address, professional headline, work experience, education, skills, and career goals.',
              },
              {
                title: 'OAuth Data',
                content: 'When you connect via LinkedIn or Google, we collect profile information, connections, and endorsements as permitted by those platforms.',
              },
              {
                title: 'Usage Data',
                content: 'We automatically collect information about your interactions with our platform, including job searches, applications, and document generation.',
              },
              {
                title: 'Blockchain Data',
                content: 'Academic credentials are stored on blockchain with cryptographic hashes. Only you control access to this data.',
              },
            ],
          },
          
          howWeUseInformation: {
            title: 'How We Use Your Information',
            purposes: [
              'Provide personalized job recommendations',
              'Generate tailored resumes and cover letters',
              'Track application progress',
              'Provide interview preparation materials',
              'Calculate skill scores and identify gaps',
              'Send job alerts and notifications',
              'Improve our services through analytics',
              'Comply with legal obligations',
            ],
          },
          
          dataSharing: {
            title: 'Data Sharing and Disclosure',
            content: 'We do not sell your personal information. We may share your data with: job boards (when you apply), service providers (for AI processing), and legal authorities (when required by law).',
          },
          
          dataRetention: {
            title: 'Data Retention',
            content: 'We retain your data for as long as your account is active. You can request data export or account deletion at any time. Deleted data is removed within 30 days, except where required by law.',
          },
          
          yourRights: {
            title: 'Your Rights (GDPR)',
            rights: [
              'Right to access your data',
              'Right to rectification',
              'Right to erasure ("right to be forgotten")',
              'Right to data portability',
              'Right to restrict processing',
              'Right to object to processing',
              'Right to withdraw consent',
            ],
          },
          
          security: {
            title: 'Security',
            content: 'We implement industry-standard security measures including TLS encryption, bcrypt password hashing, blockchain immutability, and regular security audits.',
          },
          
          cookies: {
            title: 'Cookies and Tracking',
            content: 'We use cookies for authentication, preferences, and analytics. You can control cookie settings in your browser.',
          },
          
          contact: {
            title: 'Contact Us',
            content: 'For privacy concerns or to exercise your rights, contact us at: privacy@givemejobs.com',
          },
        },
      };

      res.json(privacyPolicy);
    } catch (error) {
      logger.error('Error getting privacy policy:', error);
      res.status(500).json({ error: 'Failed to get privacy policy' });
    }
  }

  /**
   * Get terms of service
   */
  async getTermsOfService(req: Request, res: Response): Promise<void> {
    try {
      const termsOfService = {
        version: CURRENT_VERSIONS.terms_of_service,
        effectiveDate: '2024-01-01',
        lastUpdated: '2024-01-01',
        content: {
          introduction: `These Terms of Service ("Terms") govern your access to and use of GiveMeJobs ("Platform", "Service"). By using our Platform, you agree to these Terms.`,
          
          accountRegistration: {
            title: 'Account Registration',
            content: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use this service.',
          },
          
          userResponsibilities: {
            title: 'User Responsibilities',
            responsibilities: [
              'Provide accurate and truthful information in your profile',
              'Do not misrepresent your qualifications or experience',
              'Use the platform only for lawful job search purposes',
              'Do not attempt to circumvent security measures',
              'Respect intellectual property rights',
              'Do not spam or abuse the platform',
            ],
          },
          
          platformServices: {
            title: 'Platform Services',
            content: 'We provide AI-powered job matching, resume generation, interview preparation, and application tracking. Services are provided "as is" without warranties. We do not guarantee job placement or interview success.',
          },
          
          aiGeneratedContent: {
            title: 'AI-Generated Content',
            content: 'Our platform uses AI to generate resumes, cover letters, and interview materials. You are responsible for reviewing and approving all AI-generated content before use. We are not liable for the accuracy or effectiveness of AI-generated materials.',
          },
          
          intellectualProperty: {
            title: 'Intellectual Property',
            content: 'You retain ownership of your personal data and content. We retain ownership of the platform, algorithms, and AI models. You grant us a license to use your data to provide services.',
          },
          
          dataUsage: {
            title: 'Data Usage',
            content: 'By using our platform, you consent to data collection and processing as described in our Privacy Policy. You can withdraw consent or request data deletion at any time.',
          },
          
          termination: {
            title: 'Account Termination',
            content: 'You may terminate your account at any time. We may suspend or terminate accounts that violate these Terms. Upon termination, your data will be deleted within 30 days.',
          },
          
          disclaimers: {
            title: 'Disclaimers',
            content: 'The platform is provided "as is" without warranties. We do not guarantee uninterrupted service. We are not responsible for third-party job board content or employer actions.',
          },
          
          limitationOfLiability: {
            title: 'Limitation of Liability',
            content: 'We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid for the service in the past 12 months.',
          },
          
          changes: {
            title: 'Changes to Terms',
            content: 'We may update these Terms. We will notify you of material changes. Continued use after changes constitutes acceptance.',
          },
          
          contact: {
            title: 'Contact Us',
            content: 'For questions about these Terms, contact us at: legal@givemejobs.com',
          },
        },
      };

      res.json(termsOfService);
    } catch (error) {
      logger.error('Error getting terms of service:', error);
      res.status(500).json({ error: 'Failed to get terms of service' });
    }
  }

  /**
   * Record user consent
   */
  async recordConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { consentType, consentVersion, granted } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!consentType || !consentVersion || typeof granted !== 'boolean') {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const validConsentTypes = ['terms_of_service', 'privacy_policy', 'marketing', 'data_processing'];
      if (!validConsentTypes.includes(consentType)) {
        res.status(400).json({ error: 'Invalid consent type' });
        return;
      }

      const consent = await consentService.recordConsent({
        userId,
        consentType,
        consentVersion,
        granted,
        ipAddress,
        userAgent,
      });

      res.json({
        message: 'Consent recorded',
        consent: {
          id: consent.id,
          consentType: consent.consentType,
          granted: consent.granted,
          grantedAt: consent.grantedAt,
        },
      });
    } catch (error) {
      logger.error('Error recording consent:', error);
      res.status(500).json({ error: 'Failed to record consent' });
    }
  }

  /**
   * Get user consents
   */
  async getUserConsents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const consents = await consentService.getUserConsents(userId);

      res.json({ consents });
    } catch (error) {
      logger.error('Error getting user consents:', error);
      res.status(500).json({ error: 'Failed to get consents' });
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { consentType } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!consentType) {
        res.status(400).json({ error: 'Missing consent type' });
        return;
      }

      await consentService.revokeConsent(userId, consentType);

      res.json({ message: 'Consent revoked' });
    } catch (error) {
      logger.error('Error revoking consent:', error);
      res.status(500).json({ error: 'Failed to revoke consent' });
    }
  }
}

export const legalController = new LegalController();
