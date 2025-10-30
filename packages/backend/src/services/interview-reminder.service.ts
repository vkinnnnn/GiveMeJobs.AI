import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { emailService } from './email.service';

/**
 * Interview Reminder Service
 * Sends reminders for upcoming interviews
 */
export class InterviewReminderService {
  private db: Pool;

  constructor() {
    this.db = pgPool;
  }

  /**
   * Process interview reminders
   * Sends reminders for interviews happening in the next 24 hours
   */
  async processInterviewReminders(): Promise<void> {
    try {
      console.log('Processing interview reminders...');

      // Get interviews happening in the next 24 hours that haven't been reminded
      const query = `
        SELECT 
          ip.id,
          ip.interview_date,
          ip.questions,
          ip.tips,
          u.id as user_id,
          u.email,
          u.first_name,
          j.title as job_title,
          j.company,
          a.id as application_id
        FROM interview_prep ip
        JOIN users u ON ip.user_id = u.id
        JOIN jobs j ON ip.job_id = j.id
        JOIN applications a ON ip.application_id = a.id
        WHERE ip.interview_date IS NOT NULL
          AND ip.interview_date > NOW()
          AND ip.interview_date <= NOW() + INTERVAL '24 hours'
          AND (ip.reminder_sent_at IS NULL OR ip.reminder_sent_at < NOW() - INTERVAL '24 hours')
        ORDER BY ip.interview_date ASC
      `;

      const result = await this.db.query(query);

      console.log(`Found ${result.rows.length} interviews to remind`);

      for (const interview of result.rows) {
        try {
          await this.sendInterviewReminder(interview);
          
          // Mark reminder as sent
          await this.markReminderSent(interview.id);
        } catch (error) {
          console.error(`Error sending reminder for interview ${interview.id}:`, error);
        }
      }

      console.log('✓ Interview reminders processed');
    } catch (error) {
      console.error('Error processing interview reminders:', error);
      throw error;
    }
  }

  /**
   * Send interview reminder email
   */
  private async sendInterviewReminder(interview: any): Promise<void> {
    const interviewDate = new Date(interview.interview_date);
    const hoursUntil = Math.round(
      (interviewDate.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    // Extract key preparation points
    const tips = interview.tips || [];
    const keyPoints = tips.slice(0, 5); // Top 5 tips

    await emailService.sendInterviewReminderEmail(
      interview.email,
      interview.first_name,
      {
        jobTitle: interview.job_title,
        company: interview.company,
        interviewDate: interviewDate,
        hoursUntil,
        keyPoints,
        prepLink: `${process.env.FRONTEND_URL}/interview-prep/${interview.id}`,
      }
    );
  }

  /**
   * Mark reminder as sent
   */
  private async markReminderSent(interviewPrepId: string): Promise<void> {
    const query = `
      UPDATE interview_prep
      SET reminder_sent_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [interviewPrepId]);
  }

  /**
   * Send immediate reminder for a specific interview
   */
  async sendImmediateReminder(
    interviewPrepId: string,
    userId: string
  ): Promise<void> {
    const query = `
      SELECT 
        ip.id,
        ip.interview_date,
        ip.questions,
        ip.tips,
        u.id as user_id,
        u.email,
        u.first_name,
        j.title as job_title,
        j.company
      FROM interview_prep ip
      JOIN users u ON ip.user_id = u.id
      JOIN jobs j ON ip.job_id = j.id
      WHERE ip.id = $1 AND ip.user_id = $2
    `;

    const result = await this.db.query(query, [interviewPrepId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Interview prep not found');
    }

    await this.sendInterviewReminder(result.rows[0]);
    await this.markReminderSent(interviewPrepId);
  }
}

export const interviewReminderService = new InterviewReminderService();
