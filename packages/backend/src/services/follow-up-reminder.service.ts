import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { ApplicationStatus } from '@givemejobs/shared-types';
import { notificationService } from './notification.service';

/**
 * Follow-up Reminder Service
 * Checks for applications that need follow-up and sends reminders
 */
export class FollowUpReminderService {
  private db: Pool;

  constructor() {
    this.db = pgPool;
  }

  /**
   * Process follow-up reminders
   * Checks applications that are due for follow-up
   */
  async processFollowUpReminders(): Promise<void> {
    console.log('Processing follow-up reminders...');

    try {
      // Find applications that need follow-up
      const applicationsNeedingFollowUp = await this.getApplicationsNeedingFollowUp();

      console.log(`Found ${applicationsNeedingFollowUp.length} applications needing follow-up`);

      for (const application of applicationsNeedingFollowUp) {
        await this.sendFollowUpReminder(application);
      }

      console.log('✓ Follow-up reminders processed');
    } catch (error) {
      console.error('Error processing follow-up reminders:', error);
      throw error;
    }
  }

  /**
   * Get applications that need follow-up
   */
  private async getApplicationsNeedingFollowUp(): Promise<any[]> {
    const query = `
      SELECT 
        a.id as application_id,
        a.user_id,
        a.job_id,
        a.status,
        a.applied_date,
        a.follow_up_date,
        j.title as job_title,
        j.company
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE 
        a.follow_up_date IS NOT NULL
        AND a.follow_up_date <= CURRENT_DATE
        AND a.status IN ($1, $2, $3)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = a.user_id
          AND n.type = 'follow_up_reminder'
          AND n.metadata->>'applicationId' = a.id::text
          AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
        )
      ORDER BY a.follow_up_date ASC
      LIMIT 100
    `;

    const result = await this.db.query(query, [
      ApplicationStatus.APPLIED,
      ApplicationStatus.SCREENING,
      ApplicationStatus.INTERVIEW_SCHEDULED,
    ]);

    return result.rows;
  }

  /**
   * Send follow-up reminder notification
   */
  private async sendFollowUpReminder(application: any): Promise<void> {
    try {
      const daysSinceApplied = Math.floor(
        (Date.now() - new Date(application.applied_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create notification
      await notificationService.createNotification({
        userId: application.user_id,
        type: 'follow_up_reminder',
        title: 'Time to Follow Up!',
        message: `It's been ${daysSinceApplied} days since you applied to ${application.job_title} at ${application.company}. Consider following up to show your continued interest.`,
        link: `/applications/${application.application_id}`,
        metadata: {
          applicationId: application.application_id,
          jobId: application.job_id,
          daysSinceApplied,
        },
      });

      // Update follow_up_date to 7 days from now to avoid duplicate reminders
      await this.db.query(
        `UPDATE applications 
         SET follow_up_date = CURRENT_DATE + INTERVAL '7 days'
         WHERE id = $1`,
        [application.application_id]
      );

      console.log(`✓ Follow-up reminder sent for application ${application.application_id}`);
    } catch (error) {
      console.error(`Error sending follow-up reminder for application ${application.application_id}:`, error);
    }
  }

  /**
   * Get applications needing follow-up for a specific user
   */
  async getUserFollowUpReminders(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        a.id as application_id,
        a.status,
        a.applied_date,
        a.follow_up_date,
        a.last_updated,
        j.id as job_id,
        j.title as job_title,
        j.company,
        j.location
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE 
        a.user_id = $1
        AND a.follow_up_date IS NOT NULL
        AND a.follow_up_date <= CURRENT_DATE + INTERVAL '3 days'
        AND a.status IN ($2, $3, $4)
      ORDER BY a.follow_up_date ASC
    `;

    const result = await this.db.query(query, [
      userId,
      ApplicationStatus.APPLIED,
      ApplicationStatus.SCREENING,
      ApplicationStatus.INTERVIEW_SCHEDULED,
    ]);

    return result.rows.map((row) => ({
      applicationId: row.application_id,
      jobId: row.job_id,
      jobTitle: row.job_title,
      company: row.company,
      location: row.location,
      status: row.status,
      appliedDate: row.applied_date,
      followUpDate: row.follow_up_date,
      lastUpdated: row.last_updated,
      daysSinceApplied: Math.floor(
        (Date.now() - new Date(row.applied_date).getTime()) / (1000 * 60 * 60 * 24)
      ),
      daysUntilFollowUp: Math.floor(
        (new Date(row.follow_up_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }

  /**
   * Manually trigger follow-up reminder for an application
   */
  async triggerFollowUpReminder(applicationId: string, userId: string): Promise<void> {
    const query = `
      SELECT 
        a.id as application_id,
        a.user_id,
        a.job_id,
        a.status,
        a.applied_date,
        j.title as job_title,
        j.company
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = $1 AND a.user_id = $2
    `;

    const result = await this.db.query(query, [applicationId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    await this.sendFollowUpReminder(result.rows[0]);
  }
}

export const followUpReminderService = new FollowUpReminderService();
