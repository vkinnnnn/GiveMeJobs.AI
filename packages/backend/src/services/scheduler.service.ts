import { jobAlertProcessorService } from './job-alert-processor.service';
import { followUpReminderService } from './follow-up-reminder.service';
import { interviewReminderService } from './interview-reminder.service';
import { gdprService } from './gdpr.service';

export class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Start all scheduled jobs
   */
  start(): void {
    console.log('Starting scheduler service...');

    // Process realtime alerts every hour
    const realtimeInterval = setInterval(
      () => {
        jobAlertProcessorService.processRealtimeAlerts().catch((error) => {
          console.error('Error in realtime alert processing:', error);
        });
      },
      60 * 60 * 1000 // 1 hour
    );
    this.intervals.push(realtimeInterval);

    // Process daily alerts once per day at 9 AM
    const dailyInterval = setInterval(
      () => {
        const now = new Date();
        if (now.getHours() === 9) {
          jobAlertProcessorService.processDailyAlerts().catch((error) => {
            console.error('Error in daily alert processing:', error);
          });
        }
      },
      60 * 60 * 1000 // Check every hour
    );
    this.intervals.push(dailyInterval);

    // Process weekly alerts once per week on Monday at 9 AM
    const weeklyInterval = setInterval(
      () => {
        const now = new Date();
        if (now.getDay() === 1 && now.getHours() === 9) {
          jobAlertProcessorService.processWeeklyAlerts().catch((error) => {
            console.error('Error in weekly alert processing:', error);
          });
        }
      },
      60 * 60 * 1000 // Check every hour
    );
    this.intervals.push(weeklyInterval);

    // Process follow-up reminders once per day at 10 AM
    const followUpInterval = setInterval(
      () => {
        const now = new Date();
        if (now.getHours() === 10) {
          followUpReminderService.processFollowUpReminders().catch((error) => {
            console.error('Error in follow-up reminder processing:', error);
          });
        }
      },
      60 * 60 * 1000 // Check every hour
    );
    this.intervals.push(followUpInterval);

    // Process interview reminders every 6 hours
    const interviewReminderInterval = setInterval(
      () => {
        interviewReminderService.processInterviewReminders().catch((error) => {
          console.error('Error in interview reminder processing:', error);
        });
      },
      6 * 60 * 60 * 1000 // Every 6 hours
    );
    this.intervals.push(interviewReminderInterval);

    // Process scheduled account deletions once per day at 2 AM
    const gdprDeletionInterval = setInterval(
      () => {
        const now = new Date();
        if (now.getHours() === 2) {
          gdprService.processScheduledDeletions().catch((error) => {
            console.error('Error in GDPR deletion processing:', error);
          });
        }
      },
      60 * 60 * 1000 // Check every hour
    );
    this.intervals.push(gdprDeletionInterval);

    // Run initial processing after 10 seconds
    setTimeout(() => {
      jobAlertProcessorService.processAllAlerts().catch((error) => {
        console.error('Error in initial alert processing:', error);
      });
    }, 10000);

    console.log('✓ Scheduler service started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('Stopping scheduler service...');
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
    console.log('✓ Scheduler service stopped');
  }
}

export const schedulerService = new SchedulerService();
