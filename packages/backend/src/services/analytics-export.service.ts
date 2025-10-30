import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { AnalyticsExportOptions } from '../types/analytics.types';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * Analytics Export Service
 * Handles exporting analytics data to CSV and PDF formats
 */
export class AnalyticsExportService {
  private db: Pool;

  constructor() {
    this.db = pgPool;
  }

  /**
   * Export analytics data to CSV
   */
  async exportToCSV(
    userId: string,
    options: AnalyticsExportOptions
  ): Promise<string> {
    const dateRange = this.getDateRange(options.period);

    // Get application data
    const query = `
      SELECT 
        a.id,
        j.title as job_title,
        j.company,
        j.location,
        a.status,
        a.applied_date,
        a.last_updated,
        a.application_method,
        EXTRACT(EPOCH FROM (
          (SELECT MIN(at.created_at)
           FROM application_timeline at
           WHERE at.application_id = a.id
             AND at.event_type = 'status_changed'
             AND at.metadata->>'newStatus' IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received')
          ) - a.applied_date
        )) / 86400 as response_time_days
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
        AND a.applied_date >= $2
        AND a.applied_date <= $3
        AND a.status != 'saved'
      ORDER BY a.applied_date DESC
    `;

    const result = await this.db.query(query, [userId, dateRange.startDate, dateRange.endDate]);

    // Build CSV
    const headers = [
      'Application ID',
      'Job Title',
      'Company',
      'Location',
      'Status',
      'Applied Date',
      'Last Updated',
      'Application Method',
      'Response Time (Days)',
    ];

    let csv = headers.join(',') + '\n';

    result.rows.forEach((row) => {
      const values = [
        row.id,
        this.escapeCSV(row.job_title || 'N/A'),
        this.escapeCSV(row.company || 'N/A'),
        this.escapeCSV(row.location || 'N/A'),
        row.status,
        new Date(row.applied_date).toISOString().split('T')[0],
        new Date(row.last_updated).toISOString().split('T')[0],
        row.application_method || 'N/A',
        row.response_time_days ? Math.round(parseFloat(row.response_time_days) * 10) / 10 : 'N/A',
      ];

      csv += values.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Export analytics data to PDF
   */
  async exportToPDF(
    userId: string,
    options: AnalyticsExportOptions
  ): Promise<PDFDocument> {
    const dateRange = this.getDateRange(options.period);

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status != 'saved') as applications_sent,
        COUNT(*) FILTER (WHERE status IN ('screening', 'interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as responded,
        COUNT(*) FILTER (WHERE status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted')) as interviews,
        COUNT(*) FILTER (WHERE status IN ('offer_received', 'accepted')) as offers,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM applications
      WHERE user_id = $1
        AND applied_date >= $2
        AND applied_date <= $3
    `;

    const statsResult = await this.db.query(statsQuery, [
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ]);

    const stats = statsResult.rows[0];
    const applicationsSent = parseInt(stats.applications_sent) || 0;
    const responded = parseInt(stats.responded) || 0;
    const interviews = parseInt(stats.interviews) || 0;
    const offers = parseInt(stats.offers) || 0;
    const rejected = parseInt(stats.rejected) || 0;

    const responseRate = applicationsSent > 0 ? (responded / applicationsSent) * 100 : 0;
    const interviewRate = applicationsSent > 0 ? (interviews / applicationsSent) * 100 : 0;
    const offerRate = applicationsSent > 0 ? (offers / applicationsSent) * 100 : 0;

    // Get recent applications
    const appsQuery = `
      SELECT 
        j.title as job_title,
        j.company,
        a.status,
        a.applied_date
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
        AND a.applied_date >= $2
        AND a.applied_date <= $3
        AND a.status != 'saved'
      ORDER BY a.applied_date DESC
      LIMIT 20
    `;

    const appsResult = await this.db.query(appsQuery, [
      userId,
      dateRange.startDate,
      dateRange.endDate,
    ]);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Title
    doc.fontSize(24).text('Job Search Analytics Report', { align: 'center' });
    doc.moveDown();

    // Period
    doc
      .fontSize(12)
      .text(
        `Period: ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
        { align: 'center' }
      );
    doc.moveDown(2);

    // Summary Statistics
    doc.fontSize(16).text('Summary Statistics', { underline: true });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Applications Sent: ${applicationsSent}`);
    doc.text(`Response Rate: ${Math.round(responseRate * 10) / 10}%`);
    doc.text(`Interview Rate: ${Math.round(interviewRate * 10) / 10}%`);
    doc.text(`Offer Rate: ${Math.round(offerRate * 10) / 10}%`);
    doc.text(`Rejected: ${rejected}`);
    doc.moveDown(2);

    // Recent Applications
    if (appsResult.rows.length > 0) {
      doc.fontSize(16).text('Recent Applications', { underline: true });
      doc.moveDown();

      doc.fontSize(10);
      appsResult.rows.forEach((row, index) => {
        const date = new Date(row.applied_date).toLocaleDateString();
        doc.text(
          `${index + 1}. ${row.job_title || 'N/A'} at ${row.company || 'N/A'} - ${row.status} (${date})`
        );
      });
    }

    // Footer
    doc
      .fontSize(8)
      .text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
        align: 'center',
      });

    doc.end();

    return doc;
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
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
}

export const analyticsExportService = new AnalyticsExportService();
