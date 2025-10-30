import { Pool } from 'pg';
import { pgPool } from '../config/database';
import {
  AnalyticsDashboard,
  AnalyticsMetrics,
  TrendData,
  Insight,
  BenchmarkComparison,
  ApplicationAnalytics,
} from '../types/analytics.types';
import { ApplicationStatus } from '@givemejobs/shared-types';

/**
 * Analytics Service
 * Handles analytics calculations, insights generation, and benchmarking
 */
export class AnalyticsService {
  private db: Pool;

  constructor() {
    this.db = pgPool;
  }

  /**
   * Get analytics dashboard for a user
   */
  async getDashboard(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<AnalyticsDashboard> {
    const dateRange = this.getDateRange(period);

    // Calculate metrics
    const metrics = await this.calculateMetrics(userId, dateRange);

    // Generate trend data
    const trends = await this.generateTrends(userId, period, dateRange);

    // Generate insights
    const insights = await this.generateInsights(userId, metrics, trends);

    return {
      userId,
      period,
      metrics,
      trends,
      insights,
    };
  }

  /**
   * Calculate key metrics for a user
   */
  async calculateMetrics(
    userId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<AnalyticsMetrics> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status != 'saved') as applications_sent,
        COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded,
        COUNT(*) FILTER (WHERE status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as interviews,
        COUNT(*) FILTER (WHERE status IN ('offer_received', 'accepted')) as offers,
        COUNT(*) FILTER (WHERE status IN ('saved', 'applied', 'screening', 'interview_scheduled', 'interview_completed', 'offer_received')) as active
      FROM applications
      WHERE user_id = $1
        AND applied_date >= $2
        AND applied_date <= $3
    `;

    const result = await this.db.query(query, [userId, dateRange.startDate, dateRange.endDate]);
    const row = result.rows[0];

    const applicationsSent = parseInt(row.applications_sent) || 0;
    const responded = parseInt(row.responded) || 0;
    const interviews = parseInt(row.interviews) || 0;
    const offers = parseInt(row.offers) || 0;
    const activeApplications = parseInt(row.active) || 0;

    // Calculate rates
    const responseRate = applicationsSent > 0 ? (responded / applicationsSent) * 100 : 0;
    const interviewRate = applicationsSent > 0 ? (interviews / applicationsSent) * 100 : 0;
    const offerRate = applicationsSent > 0 ? (offers / applicationsSent) * 100 : 0;

    // Calculate average response time
    const averageResponseTime = await this.calculateAverageResponseTime(userId, dateRange);

    return {
      applicationsSent,
      responseRate: Math.round(responseRate * 10) / 10,
      interviewRate: Math.round(interviewRate * 10) / 10,
      offerRate: Math.round(offerRate * 10) / 10,
      averageResponseTime,
      activeApplications,
    };
  }

  /**
   * Calculate average response time in days
   */
  private async calculateAverageResponseTime(
    userId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<number> {
    const query = `
      SELECT AVG(
        EXTRACT(EPOCH FROM (
          (SELECT MIN(at.created_at)
           FROM application_timeline at
           WHERE at.application_id = a.id
             AND at.event_type = 'status_changed'
             AND at.metadata->>'newStatus' IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received')
          ) - a.applied_date
        )) / 86400
      ) as avg_response_days
      FROM applications a
      WHERE a.user_id = $1
        AND a.applied_date >= $2
        AND a.applied_date <= $3
        AND a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted', 'rejected')
    `;

    const result = await this.db.query(query, [userId, dateRange.startDate, dateRange.endDate]);
    const avgDays = parseFloat(result.rows[0]?.avg_response_days) || 0;

    return Math.round(avgDays * 10) / 10;
  }

  /**
   * Generate trend data for various metrics
   */
  async generateTrends(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year',
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<TrendData[]> {
    const interval = this.getTrendInterval(period);
    const trends: TrendData[] = [];

    // Applications sent trend
    const applicationsTrend = await this.getMetricTrend(
      userId,
      'applications_sent',
      interval,
      dateRange
    );
    trends.push(applicationsTrend);

    // Response rate trend
    const responseRateTrend = await this.getResponseRateTrend(userId, interval, dateRange);
    trends.push(responseRateTrend);

    // Interview rate trend
    const interviewRateTrend = await this.getInterviewRateTrend(userId, interval, dateRange);
    trends.push(interviewRateTrend);

    return trends;
  }

  /**
   * Get trend data for a specific metric
   */
  private async getMetricTrend(
    userId: string,
    metric: string,
    interval: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<TrendData> {
    const query = `
      SELECT 
        DATE_TRUNC($1, applied_date) as date,
        COUNT(*) FILTER (WHERE status != 'saved') as value
      FROM applications
      WHERE user_id = $2
        AND applied_date >= $3
        AND applied_date <= $4
      GROUP BY DATE_TRUNC($1, applied_date)
      ORDER BY date ASC
    `;

    const result = await this.db.query(query, [
      interval,
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ]);

    const data = result.rows.map((row) => ({
      date: new Date(row.date),
      value: parseInt(row.value) || 0,
    }));

    // Calculate change percentage
    const change = this.calculateChange(data);
    const direction = this.getDirection(change);

    return {
      metric: 'Applications Sent',
      data,
      change,
      direction,
    };
  }

  /**
   * Get response rate trend
   */
  private async getResponseRateTrend(
    userId: string,
    interval: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<TrendData> {
    const query = `
      SELECT 
        DATE_TRUNC($1, applied_date) as date,
        COUNT(*) FILTER (WHERE status != 'saved') as total,
        COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded
      FROM applications
      WHERE user_id = $2
        AND applied_date >= $3
        AND applied_date <= $4
      GROUP BY DATE_TRUNC($1, applied_date)
      ORDER BY date ASC
    `;

    const result = await this.db.query(query, [
      interval,
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ]);

    const data = result.rows.map((row) => {
      const total = parseInt(row.total) || 0;
      const responded = parseInt(row.responded) || 0;
      const rate = total > 0 ? (responded / total) * 100 : 0;

      return {
        date: new Date(row.date),
        value: Math.round(rate * 10) / 10,
      };
    });

    const change = this.calculateChange(data);
    const direction = this.getDirection(change);

    return {
      metric: 'Response Rate',
      data,
      change,
      direction,
    };
  }

  /**
   * Get interview rate trend
   */
  private async getInterviewRateTrend(
    userId: string,
    interval: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<TrendData> {
    const query = `
      SELECT 
        DATE_TRUNC($1, applied_date) as date,
        COUNT(*) FILTER (WHERE status != 'saved') as total,
        COUNT(*) FILTER (WHERE status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as interviews
      FROM applications
      WHERE user_id = $2
        AND applied_date >= $3
        AND applied_date <= $4
      GROUP BY DATE_TRUNC($1, applied_date)
      ORDER BY date ASC
    `;

    const result = await this.db.query(query, [
      interval,
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ]);

    const data = result.rows.map((row) => {
      const total = parseInt(row.total) || 0;
      const interviews = parseInt(row.interviews) || 0;
      const rate = total > 0 ? (interviews / total) * 100 : 0;

      return {
        date: new Date(row.date),
        value: Math.round(rate * 10) / 10,
      };
    });

    const change = this.calculateChange(data);
    const direction = this.getDirection(change);

    return {
      metric: 'Interview Rate',
      data,
      change,
      direction,
    };
  }

  /**
   * Calculate percentage change between first and last data points
   */
  private calculateChange(data: { date: Date; value: number }[]): number {
    if (data.length < 2) return 0;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;

    if (firstValue === 0) return lastValue > 0 ? 100 : 0;

    const change = ((lastValue - firstValue) / firstValue) * 100;
    return Math.round(change * 10) / 10;
  }

  /**
   * Determine trend direction
   */
  private getDirection(change: number): 'up' | 'down' | 'stable' {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  /**
   * Get date range based on period
   */
  private getDateRange(period: 'week' | 'month' | 'quarter' | 'year'): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Get trend interval based on period
   */
  private getTrendInterval(period: 'week' | 'month' | 'quarter' | 'year'): string {
    switch (period) {
      case 'week':
        return 'day';
      case 'month':
        return 'week';
      case 'quarter':
        return 'week';
      case 'year':
        return 'month';
    }
  }

  /**
   * Generate actionable insights based on user data
   */
  async generateInsights(
    userId: string,
    metrics: AnalyticsMetrics,
    trends: TrendData[]
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Insight: Low response rate
    if (metrics.responseRate < 20 && metrics.applicationsSent >= 10) {
      insights.push({
        type: 'warning',
        title: 'Low Response Rate',
        description: `Your response rate is ${metrics.responseRate}%, which is below average. Consider tailoring your applications more carefully.`,
        actionable: true,
        recommendation:
          'Use Mr.TAILOUR to generate more targeted resumes and cover letters for each application.',
      });
    }

    // Insight: High response rate
    if (metrics.responseRate > 50 && metrics.applicationsSent >= 5) {
      insights.push({
        type: 'success',
        title: 'Excellent Response Rate',
        description: `Your response rate of ${metrics.responseRate}% is well above average! Keep up the great work.`,
        actionable: false,
      });
    }

    // Insight: Slow response time
    if (metrics.averageResponseTime > 21) {
      insights.push({
        type: 'info',
        title: 'Long Response Times',
        description: `Companies are taking an average of ${metrics.averageResponseTime} days to respond. This is normal, but consider following up after 14 days.`,
        actionable: true,
        recommendation: 'Set up follow-up reminders for applications pending over 14 days.',
      });
    }

    // Insight: Low interview conversion
    if (metrics.interviewRate < 10 && metrics.applicationsSent >= 20) {
      insights.push({
        type: 'warning',
        title: 'Low Interview Conversion',
        description: `Only ${metrics.interviewRate}% of your applications are leading to interviews. Your profile or applications may need improvement.`,
        actionable: true,
        recommendation:
          'Review your skill score and consider adding more relevant skills or experience to your profile.',
      });
    }

    // Insight: Positive trend
    const applicationsTrend = trends.find((t) => t.metric === 'Applications Sent');
    if (applicationsTrend && applicationsTrend.direction === 'up') {
      insights.push({
        type: 'success',
        title: 'Increasing Activity',
        description: `Your application activity has increased by ${Math.abs(applicationsTrend.change)}% recently. Consistency is key!`,
        actionable: false,
      });
    }

    // Insight: Declining trend
    if (applicationsTrend && applicationsTrend.direction === 'down') {
      insights.push({
        type: 'info',
        title: 'Declining Activity',
        description: `Your application activity has decreased by ${Math.abs(applicationsTrend.change)}% recently. Stay consistent to maximize opportunities.`,
        actionable: true,
        recommendation: 'Set a goal to apply to at least 5 jobs per week.',
      });
    }

    // Insight: No active applications
    if (metrics.activeApplications === 0 && metrics.applicationsSent > 0) {
      insights.push({
        type: 'info',
        title: 'No Active Applications',
        description: 'All your applications have been closed. Time to start applying to new opportunities!',
        actionable: true,
        recommendation: 'Browse job recommendations and save interesting positions.',
      });
    }

    // Insight: Many active applications
    if (metrics.activeApplications > 20) {
      insights.push({
        type: 'success',
        title: 'Strong Pipeline',
        description: `You have ${metrics.activeApplications} active applications. Great job maintaining a healthy pipeline!`,
        actionable: false,
      });
    }

    // Advanced pattern analysis
    const patternInsights = await this.analyzePatterns(userId);
    insights.push(...patternInsights);

    return insights;
  }

  /**
   * Analyze user patterns to identify opportunities for improvement
   */
  private async analyzePatterns(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Analyze application timing patterns
    const timingInsight = await this.analyzeApplicationTiming(userId);
    if (timingInsight) insights.push(timingInsight);

    // Analyze company response patterns
    const companyInsight = await this.analyzeCompanyPatterns(userId);
    if (companyInsight) insights.push(companyInsight);

    // Analyze skill match patterns
    const skillInsight = await this.analyzeSkillMatchPatterns(userId);
    if (skillInsight) insights.push(skillInsight);

    return insights;
  }

  /**
   * Analyze when user applies and success rates by day of week
   */
  private async analyzeApplicationTiming(userId: string): Promise<Insight | null> {
    const query = `
      SELECT 
        EXTRACT(DOW FROM applied_date) as day_of_week,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded
      FROM applications
      WHERE user_id = $1
        AND applied_date >= CURRENT_DATE - INTERVAL '3 months'
        AND status != 'saved'
      GROUP BY EXTRACT(DOW FROM applied_date)
      HAVING COUNT(*) >= 3
      ORDER BY (COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'))::float / COUNT(*)) DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const dayOfWeek = parseInt(row.day_of_week);
    const responseRate = (parseInt(row.responded) / parseInt(row.total)) * 100;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = dayNames[dayOfWeek];

    if (responseRate > 30) {
      return {
        type: 'info',
        title: 'Best Day to Apply',
        description: `Your applications on ${bestDay}s have a ${Math.round(responseRate)}% response rate, which is your best performing day.`,
        actionable: true,
        recommendation: `Consider applying to more jobs on ${bestDay}s to maximize your response rate.`,
      };
    }

    return null;
  }

  /**
   * Analyze which types of companies respond most
   */
  private async analyzeCompanyPatterns(userId: string): Promise<Insight | null> {
    const query = `
      SELECT 
        j.company,
        COUNT(*) as applications,
        COUNT(*) FILTER (WHERE a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responses
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
        AND a.applied_date >= CURRENT_DATE - INTERVAL '3 months'
        AND a.status != 'saved'
      GROUP BY j.company
      HAVING COUNT(*) >= 2
        AND COUNT(*) FILTER (WHERE a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) > 0
      ORDER BY (COUNT(*) FILTER (WHERE a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'))::float / COUNT(*)) DESC
      LIMIT 3
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) return null;

    const topCompanies = result.rows.map((row) => row.company);

    return {
      type: 'info',
      title: 'Responsive Companies',
      description: `Companies like ${topCompanies.join(', ')} have been most responsive to your applications.`,
      actionable: true,
      recommendation: 'Look for similar companies or roles at these organizations.',
    };
  }

  /**
   * Analyze correlation between skill match and success
   */
  private async analyzeSkillMatchPatterns(userId: string): Promise<Insight | null> {
    // This would require job matching data to be stored with applications
    // For now, return a generic insight if user has low success rate
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as success
      FROM applications
      WHERE user_id = $1
        AND applied_date >= CURRENT_DATE - INTERVAL '3 months'
        AND status != 'saved'
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) return null;

    const total = parseInt(result.rows[0].total);
    const success = parseInt(result.rows[0].success);

    if (total >= 15 && success < total * 0.15) {
      return {
        type: 'warning',
        title: 'Consider Better Matches',
        description: 'Your success rate suggests you may be applying to jobs that don\'t match your skills well.',
        actionable: true,
        recommendation: 'Focus on jobs with higher match scores (above 70%) to improve your success rate.',
      };
    }

    return null;
  }

  /**
   * Get benchmark comparison (platform-wide averages)
   */
  async getBenchmarkComparison(userId: string): Promise<BenchmarkComparison> {
    // Get user metrics for the last 3 months
    const dateRange = this.getDateRange('quarter');
    const userMetrics = await this.calculateMetrics(userId, dateRange);

    // Calculate platform averages
    const platformQuery = `
      WITH user_stats AS (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE status != 'saved') as applications_sent,
          COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded,
          COUNT(*) FILTER (WHERE status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as interviews,
          COUNT(*) FILTER (WHERE status IN ('offer_received', 'accepted')) as offers
        FROM applications
        WHERE applied_date >= $1 AND applied_date <= $2
        GROUP BY user_id
        HAVING COUNT(*) FILTER (WHERE status != 'saved') >= 5
      )
      SELECT 
        AVG(CASE WHEN applications_sent > 0 THEN (responded::float / applications_sent) * 100 ELSE 0 END) as avg_response_rate,
        AVG(CASE WHEN applications_sent > 0 THEN (interviews::float / applications_sent) * 100 ELSE 0 END) as avg_interview_rate,
        AVG(CASE WHEN applications_sent > 0 THEN (offers::float / applications_sent) * 100 ELSE 0 END) as avg_offer_rate,
        AVG(applications_sent) as avg_applications_sent
      FROM user_stats
    `;

    const platformResult = await this.db.query(platformQuery, [
      dateRange.startDate,
      dateRange.endDate,
    ]);

    const platformAvg = platformResult.rows[0];
    const platformAverage = {
      responseRate: Math.round((parseFloat(platformAvg.avg_response_rate) || 0) * 10) / 10,
      interviewRate: Math.round((parseFloat(platformAvg.avg_interview_rate) || 0) * 10) / 10,
      offerRate: Math.round((parseFloat(platformAvg.avg_offer_rate) || 0) * 10) / 10,
      applicationsSent: Math.round(parseFloat(platformAvg.avg_applications_sent) || 0),
    };

    // Calculate percentile
    const percentileQuery = `
      WITH user_stats AS (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE status != 'saved') as applications_sent,
          COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded
        FROM applications
        WHERE applied_date >= $1 AND applied_date <= $2
        GROUP BY user_id
        HAVING COUNT(*) FILTER (WHERE status != 'saved') >= 5
      ),
      user_rates AS (
        SELECT 
          user_id,
          CASE WHEN applications_sent > 0 THEN (responded::float / applications_sent) * 100 ELSE 0 END as response_rate
        FROM user_stats
      )
      SELECT 
        COUNT(*) FILTER (WHERE response_rate <= $3)::float / COUNT(*)::float * 100 as percentile
      FROM user_rates
    `;

    const percentileResult = await this.db.query(percentileQuery, [
      dateRange.startDate,
      dateRange.endDate,
      userMetrics.responseRate,
    ]);

    const percentile = Math.round(parseFloat(percentileResult.rows[0]?.percentile) || 50);

    // Build comparison array
    const comparison = [
      {
        metric: 'Response Rate',
        userValue: userMetrics.responseRate,
        avgValue: platformAverage.responseRate,
        performance: this.getPerformance(userMetrics.responseRate, platformAverage.responseRate),
      },
      {
        metric: 'Interview Rate',
        userValue: userMetrics.interviewRate,
        avgValue: platformAverage.interviewRate,
        performance: this.getPerformance(userMetrics.interviewRate, platformAverage.interviewRate),
      },
      {
        metric: 'Offer Rate',
        userValue: userMetrics.offerRate,
        avgValue: platformAverage.offerRate,
        performance: this.getPerformance(userMetrics.offerRate, platformAverage.offerRate),
      },
    ];

    return {
      userMetrics: {
        responseRate: userMetrics.responseRate,
        interviewRate: userMetrics.interviewRate,
        offerRate: userMetrics.offerRate,
        applicationsSent: userMetrics.applicationsSent,
      },
      platformAverage,
      percentile,
      comparison,
    };
  }

  /**
   * Determine performance relative to average
   */
  private getPerformance(
    userValue: number,
    avgValue: number
  ): 'above' | 'below' | 'average' {
    const difference = ((userValue - avgValue) / avgValue) * 100;

    if (difference > 10) return 'above';
    if (difference < -10) return 'below';
    return 'average';
  }

  /**
   * Get detailed application analytics
   */
  async getApplicationAnalytics(userId: string): Promise<ApplicationAnalytics> {
    // Get best days to apply
    const bestDays = await this.getBestDaysToApply(userId);

    // Get most responsive companies
    const responsiveCompanies = await this.getMostResponsiveCompanies(userId);

    // Get average time to response by status
    const avgTimeToResponse = await this.getAverageTimeToResponse(userId);

    // Get success rate by industry (if we have industry data)
    const successByIndustry = await this.getSuccessRateByIndustry(userId);

    // Get highest converting resume formats (placeholder - would need document metadata)
    const resumeFormats = await this.getHighestConvertingResumeFormats(userId);

    return {
      bestDaysToApply: bestDays,
      mostResponsiveCompanies: responsiveCompanies,
      highestConvertingResumeFormats: resumeFormats,
      averageTimeToResponse: avgTimeToResponse,
      successRateByIndustry: successByIndustry,
    };
  }

  /**
   * Get best days of week to apply based on response rates
   */
  private async getBestDaysToApply(userId: string): Promise<string[]> {
    const query = `
      SELECT 
        EXTRACT(DOW FROM applied_date) as day_of_week,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded
      FROM applications
      WHERE user_id = $1
        AND applied_date >= CURRENT_DATE - INTERVAL '6 months'
        AND status != 'saved'
      GROUP BY EXTRACT(DOW FROM applied_date)
      HAVING COUNT(*) >= 3
      ORDER BY (COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'))::float / COUNT(*)) DESC
      LIMIT 3
    `;

    const result = await this.db.query(query, [userId]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return result.rows.map((row) => dayNames[parseInt(row.day_of_week)]);
  }

  /**
   * Get most responsive companies
   */
  private async getMostResponsiveCompanies(userId: string): Promise<string[]> {
    const query = `
      SELECT 
        j.company,
        COUNT(*) as applications,
        COUNT(*) FILTER (WHERE a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responses
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
        AND a.applied_date >= CURRENT_DATE - INTERVAL '6 months'
        AND a.status != 'saved'
      GROUP BY j.company
      HAVING COUNT(*) >= 1
        AND COUNT(*) FILTER (WHERE a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) > 0
      ORDER BY (COUNT(*) FILTER (WHERE a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted'))::float / COUNT(*)) DESC,
               COUNT(*) DESC
      LIMIT 5
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row) => row.company);
  }

  /**
   * Get average time to response by application status
   */
  private async getAverageTimeToResponse(userId: string): Promise<Record<string, number>> {
    const query = `
      SELECT 
        a.status,
        AVG(
          EXTRACT(EPOCH FROM (
            (SELECT MIN(at.created_at)
             FROM application_timeline at
             WHERE at.application_id = a.id
               AND at.event_type = 'status_changed'
               AND at.metadata->>'newStatus' = a.status
            ) - a.applied_date
          )) / 86400
        ) as avg_days
      FROM applications a
      WHERE a.user_id = $1
        AND a.applied_date >= CURRENT_DATE - INTERVAL '6 months'
        AND a.status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'rejected')
      GROUP BY a.status
    `;

    const result = await this.db.query(query, [userId]);

    const avgTimes: Record<string, number> = {};

    result.rows.forEach((row) => {
      const avgDays = parseFloat(row.avg_days) || 0;
      avgTimes[row.status] = Math.round(avgDays * 10) / 10;
    });

    return avgTimes;
  }

  /**
   * Get success rate by industry
   */
  private async getSuccessRateByIndustry(userId: string): Promise<Record<string, number>> {
    // This would require industry data on jobs
    // For now, return empty object as placeholder
    // In a real implementation, you would join with job industry data
    const query = `
      SELECT 
        COALESCE(j.industry, 'Unknown') as industry,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as success
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
        AND a.applied_date >= CURRENT_DATE - INTERVAL '6 months'
        AND a.status != 'saved'
      GROUP BY COALESCE(j.industry, 'Unknown')
      HAVING COUNT(*) >= 3
    `;

    try {
      const result = await this.db.query(query, [userId]);

      const successRates: Record<string, number> = {};

      result.rows.forEach((row) => {
        const total = parseInt(row.total);
        const success = parseInt(row.success);
        const rate = total > 0 ? (success / total) * 100 : 0;
        successRates[row.industry] = Math.round(rate * 10) / 10;
      });

      return successRates;
    } catch (error) {
      // If industry column doesn't exist, return empty object
      return {};
    }
  }

  /**
   * Get highest converting resume formats
   */
  private async getHighestConvertingResumeFormats(userId: string): Promise<string[]> {
    // This would require document template metadata
    // For now, return placeholder data
    // In a real implementation, you would join with document templates
    const query = `
      SELECT 
        COALESCE(dt.name, 'Standard') as template_name,
        COUNT(*) as applications,
        COUNT(*) FILTER (WHERE a.status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as success
      FROM applications a
      LEFT JOIN documents d ON a.resume_id = d.id
      LEFT JOIN document_templates dt ON d.template_id = dt.id
      WHERE a.user_id = $1
        AND a.applied_date >= CURRENT_DATE - INTERVAL '6 months'
        AND a.status != 'saved'
        AND a.resume_id IS NOT NULL
      GROUP BY COALESCE(dt.name, 'Standard')
      HAVING COUNT(*) >= 3
      ORDER BY (COUNT(*) FILTER (WHERE a.status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted'))::float / COUNT(*)) DESC
      LIMIT 3
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map((row) => row.template_name);
    } catch (error) {
      // If tables don't exist or query fails, return empty array
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();
