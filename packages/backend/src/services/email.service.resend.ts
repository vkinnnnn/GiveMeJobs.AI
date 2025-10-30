import { Resend } from 'resend';

/**
 * Email Service using Resend
 * Handles sending emails for authentication and notifications
 */
export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set. Email functionality will be limited.');
      throw new Error('Resend API key not configured');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@givemejobs.com';
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Password Reset Request - GiveMeJobs',
        html: this.getPasswordResetTemplate(resetUrl),
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
      }

      console.log('Password reset email sent:', data?.id);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Welcome to GiveMeJobs!',
        html: this.getWelcomeTemplate(firstName),
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        // Don't throw error for welcome email, it's not critical
        return;
      }

      console.log('Welcome email sent:', data?.id);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error for welcome email, it's not critical
    }
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(email: string, firstName: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Password Changed - GiveMeJobs',
        html: this.getPasswordChangedTemplate(firstName),
      });

      if (error) {
        console.error('Error sending password changed email:', error);
        return;
      }

      console.log('Password changed email sent:', data?.id);
    } catch (error) {
      console.error('Error sending password changed email:', error);
    }
  }

  /**
   * Send job alert email
   */
  async sendJobAlertEmail(
    email: string,
    firstName: string,
    alertName: string,
    jobs: Array<{ id: string; title: string; company: string; location: string }>
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `New Jobs Matching "${alertName}" - GiveMeJobs`,
        html: this.getJobAlertTemplate(firstName, alertName, jobs),
      });

      if (error) {
        console.error('Error sending job alert email:', error);
        return;
      }

      console.log('Job alert email sent:', data?.id);
    } catch (error) {
      console.error('Error sending job alert email:', error);
    }
  }

  /**
   * Send interview reminder email
   */
  async sendInterviewReminderEmail(
    email: string,
    firstName: string,
    details: {
      jobTitle: string;
      company: string;
      interviewDate: Date;
      hoursUntil: number;
      keyPoints: string[];
      prepLink: string;
    }
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Interview Reminder: ${details.company} - ${details.jobTitle}`,
        html: this.getInterviewReminderTemplate(firstName, details),
      });

      if (error) {
        console.error('Error sending interview reminder email:', error);
        return;
      }

      console.log('Interview reminder email sent:', data?.id);
    } catch (error) {
      console.error('Error sending interview reminder email:', error);
    }
  }

  /**
   * Password reset email template
   */
  private getPasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for your GiveMeJobs account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
          <p><strong>This link will expire in 15 minutes.</strong></p>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <div class="footer">
            <p>Best regards,<br>The GiveMeJobs Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome email template
   */
  private getWelcomeTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to GiveMeJobs, ${firstName}! 🎉</h2>
          <p>We're excited to have you on board. GiveMeJobs is here to help you find your dream job with AI-powered tools and personalized recommendations.</p>
          <h3>Get Started:</h3>
          <ul>
            <li>Complete your profile to get better job matches</li>
            <li>Add your skills and experience</li>
            <li>Set your career goals</li>
            <li>Start exploring job opportunities</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
          <div class="footer">
            <p>Best regards,<br>The GiveMeJobs Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password changed email template
   */
  private getPasswordChangedTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Changed Successfully</h2>
          <p>Hi ${firstName},</p>
          <p>Your password has been successfully changed.</p>
          <div class="alert">
            <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
          </div>
          <p>For your security, all active sessions have been logged out. You'll need to log in again with your new password.</p>
          <div class="footer">
            <p>Best regards,<br>The GiveMeJobs Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Job alert email template
   */
  private getJobAlertTemplate(
    firstName: string,
    alertName: string,
    jobs: Array<{ id: string; title: string; company: string; location: string }>
  ): string {
    const jobsHtml = jobs
      .map(
        (job) => `
        <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 12px 0; background-color: #F9FAFB;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">${job.title}</h3>
          <p style="margin: 4px 0; color: #6B7280;"><strong>${job.company}</strong></p>
          <p style="margin: 4px 0; color: #6B7280;">📍 ${job.location}</p>
          <a href="${process.env.FRONTEND_URL}/jobs/${job.id}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">View Job</a>
        </div>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🎯 New Job Matches!</h2>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Great news! We found <strong>${jobs.length} new job${jobs.length > 1 ? 's' : ''}</strong> matching your alert "<strong>${alertName}</strong>".</p>
            ${jobsHtml}
            <div class="footer">
              <p>You're receiving this email because you set up a job alert on GiveMeJobs.</p>
              <p><a href="${process.env.FRONTEND_URL}/settings/alerts" style="color: #4F46E5;">Manage your alerts</a></p>
              <p>Best regards,<br>The GiveMeJobs Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Interview reminder email template
   */
  private getInterviewReminderTemplate(
    firstName: string,
    details: {
      jobTitle: string;
      company: string;
      interviewDate: Date;
      hoursUntil: number;
      keyPoints: string[];
      prepLink: string;
    }
  ): string {
    const dateStr = details.interviewDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const keyPointsHtml = details.keyPoints
      .map((point) => `<li style="margin: 8px 0;">${point}</li>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background-color: white; padding: 20px; border: 1px solid #E5E7EB; border-top: none; }
          .interview-details { background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .countdown { font-size: 24px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .checklist { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🎯 Interview Reminder</h2>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>This is a friendly reminder about your upcoming interview!</p>
            
            <div class="interview-details">
              <h3 style="margin-top: 0; color: #1F2937;">Interview Details</h3>
              <p style="margin: 8px 0;"><strong>Position:</strong> ${details.jobTitle}</p>
              <p style="margin: 8px 0;"><strong>Company:</strong> ${details.company}</p>
              <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${dateStr}</p>
            </div>

            <div class="countdown">
              ⏰ ${details.hoursUntil} hour${details.hoursUntil !== 1 ? 's' : ''} to go!
            </div>

            ${
              details.keyPoints.length > 0
                ? `
            <div class="checklist">
              <h3 style="margin-top: 0; color: #92400E;">📋 Key Preparation Points</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${keyPointsHtml}
              </ul>
            </div>
            `
                : ''
            }

            <p style="text-align: center;">
              <a href="${details.prepLink}" class="button">Review Your Interview Prep</a>
            </p>

            <p><strong>You've got this! 💪</strong></p>

            <div class="footer">
              <p>Good luck with your interview!</p>
              <p>Best regards,<br>The GiveMeJobs Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
