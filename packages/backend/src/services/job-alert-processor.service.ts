import { jobAlertService } from './job-alert.service';
import { jobService } from './job.service';
import { emailService } from './email.service';
import { JobAlert, JobAlertCriteria } from '../types/job-alert.types';
import { Job } from '../types/job.types';
import { pgPool } from '../config/database';

export class JobAlertProcessorService {
  private isProcessing = false;

  /**
   * Process all active job alerts
   */
  async processAllAlerts(): Promise<void> {
    if (this.isProcessing) {
      console.log('Alert processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('Starting job alert processing...');
      const alerts = await jobAlertService.getActiveAlerts();
      console.log(`Found ${alerts.length} active alerts to process`);

      for (const alert of alerts) {
        try {
          await this.processAlert(alert);
        } catch (error) {
          console.error(`Error processing alert ${alert.id}:`, error);
        }
      }

      console.log('Job alert processing completed');
    } catch (error) {
      console.error('Error in alert processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job alert
   */
  async processAlert(alert: JobAlert): Promise<void> {
    // Check if alert should be triggered based on frequency
    if (!this.shouldTriggerAlert(alert)) {
      return;
    }

    console.log(`Processing alert: ${alert.name} (${alert.id})`);

    // Search for jobs matching the alert criteria
    const matchingJobs = await this.findMatchingJobs(alert);

    if (matchingJobs.length === 0) {
      console.log(`No matching jobs found for alert ${alert.id}`);
      await jobAlertService.updateLastTriggered(alert.id);
      return;
    }

    console.log(`Found ${matchingJobs.length} matching jobs for alert ${alert.id}`);

    const jobsForNotification = matchingJobs.slice(0, 5).map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
    }));

    // Create notification for the user
    await jobAlertService.createNotification({
      userId: alert.userId,
      type: 'job_alert',
      title: `New jobs matching "${alert.name}"`,
      message: `We found ${matchingJobs.length} new job${matchingJobs.length > 1 ? 's' : ''} matching your alert criteria.`,
      data: {
        alertId: alert.id,
        alertName: alert.name,
        jobCount: matchingJobs.length,
        jobs: jobsForNotification,
      },
    });

    // Send email notification based on alert frequency
    if (alert.frequency !== 'realtime') {
      // For daily and weekly alerts, send email
      try {
        const user = await this.getUserInfo(alert.userId);
        if (user) {
          await emailService.sendJobAlertEmail(
            user.email,
            user.firstName,
            alert.name,
            jobsForNotification
          );
        }
      } catch (error) {
        console.error('Error sending job alert email:', error);
        // Continue even if email fails
      }
    }

    // Update last triggered timestamp
    await jobAlertService.updateLastTriggered(alert.id);
  }

  /**
   * Check if alert should be triggered based on frequency and last triggered time
   */
  private shouldTriggerAlert(alert: JobAlert): boolean {
    if (!alert.lastTriggered) {
      return true; // Never triggered before
    }

    const now = new Date();
    const lastTriggered = new Date(alert.lastTriggered);
    const hoursSinceLastTrigger = (now.getTime() - lastTriggered.getTime()) / (1000 * 60 * 60);

    switch (alert.frequency) {
      case 'realtime':
        // Trigger every hour for realtime alerts
        return hoursSinceLastTrigger >= 1;
      case 'daily':
        // Trigger once per day
        return hoursSinceLastTrigger >= 24;
      case 'weekly':
        // Trigger once per week
        return hoursSinceLastTrigger >= 168;
      default:
        return false;
    }
  }

  /**
   * Find jobs matching alert criteria
   */
  private async findMatchingJobs(alert: JobAlert): Promise<Job[]> {
    const criteria = alert.criteria;
    const cutoffDate = this.getCutoffDate(alert);

    try {
      // Search for jobs using the job service
      const searchResults = await jobService.searchJobs({
        keywords: criteria.keywords?.join(' '),
        location: criteria.locations?.[0],
        remoteType: criteria.remoteTypes,
        jobType: criteria.jobTypes,
        salaryMin: criteria.salaryMin,
        page: 1,
        limit: 20,
      });

      // Filter jobs posted after the last trigger time
      const newJobs = searchResults.jobs.filter((job) => {
        const postedDate = new Date(job.postedDate);
        return postedDate > cutoffDate;
      });

      return newJobs;
    } catch (error) {
      console.error('Error searching for matching jobs:', error);
      return [];
    }
  }

  /**
   * Get cutoff date based on alert frequency and last triggered time
   */
  private getCutoffDate(alert: JobAlert): Date {
    if (!alert.lastTriggered) {
      // If never triggered, look back 7 days
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    }

    return new Date(alert.lastTriggered);
  }

  /**
   * Get user information for email notifications
   */
  private async getUserInfo(
    userId: string
  ): Promise<{ email: string; firstName: string } | null> {
    try {
      const query = 'SELECT email, first_name FROM users WHERE id = $1';
      const result = await pgPool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Process realtime alerts (called more frequently)
   */
  async processRealtimeAlerts(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const alerts = await jobAlertService.getActiveAlerts();
      const realtimeAlerts = alerts.filter((alert) => alert.frequency === 'realtime');

      console.log(`Processing ${realtimeAlerts.length} realtime alerts`);

      for (const alert of realtimeAlerts) {
        try {
          await this.processAlert(alert);
        } catch (error) {
          console.error(`Error processing realtime alert ${alert.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing realtime alerts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process daily alerts
   */
  async processDailyAlerts(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const alerts = await jobAlertService.getActiveAlerts();
      const dailyAlerts = alerts.filter((alert) => alert.frequency === 'daily');

      console.log(`Processing ${dailyAlerts.length} daily alerts`);

      for (const alert of dailyAlerts) {
        try {
          await this.processAlert(alert);
        } catch (error) {
          console.error(`Error processing daily alert ${alert.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing daily alerts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process weekly alerts
   */
  async processWeeklyAlerts(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const alerts = await jobAlertService.getActiveAlerts();
      const weeklyAlerts = alerts.filter((alert) => alert.frequency === 'weekly');

      console.log(`Processing ${weeklyAlerts.length} weekly alerts`);

      for (const alert of weeklyAlerts) {
        try {
          await this.processAlert(alert);
        } catch (error) {
          console.error(`Error processing weekly alert ${alert.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing weekly alerts:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const jobAlertProcessorService = new JobAlertProcessorService();
