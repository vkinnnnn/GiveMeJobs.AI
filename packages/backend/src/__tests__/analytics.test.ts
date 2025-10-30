import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../services/analytics.service';
import { analyticsExportService } from '../services/analytics-export.service';

// Mock the database pool
vi.mock('../config/database', () => ({
  pgPool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

// Import after mocking
import { pgPool } from '../config/database';

describe('Analytics Service - Metric Calculations', () => {
  let analyticsService: AnalyticsService;
  const mockQuery = pgPool.query as any;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    vi.clearAllMocks();
  });

  describe('calculateMetrics - Accuracy Tests', () => {
    describe('Zero Applications', () => {
      it('should return all zeros when user has no applications', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '0',
            responded: '0',
            interviews: '0',
            offers: '0',
            active: '0',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: null }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };

        const metrics = await analyticsService.calculateMetrics('user-1', dateRange);

        expect(metrics.applicationsSent).toBe(0);
        expect(metrics.responseRate).toBe(0);
        expect(metrics.interviewRate).toBe(0);
        expect(metrics.offerRate).toBe(0);
        expect(metrics.averageResponseTime).toBe(0);
        expect(metrics.activeApplications).toBe(0);
      });
    });

    describe('Perfect Success Rate', () => {
      it('should calculate 100% rates when all applications succeed', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '10',
            responded: '10',
            interviews: '10',
            offers: '10',
            active: '0',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '5.5' }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };

        const metrics = await analyticsService.calculateMetrics('user-2', dateRange);

        expect(metrics.applicationsSent).toBe(10);
        expect(metrics.responseRate).toBe(100);
        expect(metrics.interviewRate).toBe(100);
        expect(metrics.offerRate).toBe(100);
        expect(metrics.averageResponseTime).toBe(5.5);
        expect(metrics.activeApplications).toBe(0);
      });
    });

    describe('Typical Success Rates', () => {
      it('should calculate correct rates for typical job search scenario', async () => {
        // 50 applications: 20 responses (40%), 10 interviews (20%), 2 offers (4%)
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '50',
            responded: '20',
            interviews: '10',
            offers: '2',
            active: '15',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '14.3' }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
        };

        const metrics = await analyticsService.calculateMetrics('user-3', dateRange);

        expect(metrics.applicationsSent).toBe(50);
        expect(metrics.responseRate).toBe(40); // 20/50 = 40%
        expect(metrics.interviewRate).toBe(20); // 10/50 = 20%
        expect(metrics.offerRate).toBe(4); // 2/50 = 4%
        expect(metrics.averageResponseTime).toBe(14.3);
        expect(metrics.activeApplications).toBe(15);
      });
    });

    describe('Low Success Rates', () => {
      it('should calculate correct rates for struggling job seeker', async () => {
        // 100 applications: 5 responses (5%), 1 interview (1%), 0 offers (0%)
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '100',
            responded: '5',
            interviews: '1',
            offers: '0',
            active: '10',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '21.7' }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
        };

        const metrics = await analyticsService.calculateMetrics('user-4', dateRange);

        expect(metrics.applicationsSent).toBe(100);
        expect(metrics.responseRate).toBe(5); // 5/100 = 5%
        expect(metrics.interviewRate).toBe(1); // 1/100 = 1%
        expect(metrics.offerRate).toBe(0); // 0/100 = 0%
        expect(metrics.averageResponseTime).toBe(21.7);
        expect(metrics.activeApplications).toBe(10);
      });
    });

    describe('High Success Rates', () => {
      it('should calculate correct rates for highly successful job seeker', async () => {
        // 20 applications: 15 responses (75%), 12 interviews (60%), 5 offers (25%)
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '20',
            responded: '15',
            interviews: '12',
            offers: '5',
            active: '8',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '7.2' }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-02-29'),
        };

        const metrics = await analyticsService.calculateMetrics('user-5', dateRange);

        expect(metrics.applicationsSent).toBe(20);
        expect(metrics.responseRate).toBe(75); // 15/20 = 75%
        expect(metrics.interviewRate).toBe(60); // 12/20 = 60%
        expect(metrics.offerRate).toBe(25); // 5/20 = 25%
        expect(metrics.averageResponseTime).toBe(7.2);
        expect(metrics.activeApplications).toBe(8);
      });
    });

    describe('Decimal Precision', () => {
      it('should round rates to one decimal place', async () => {
        // 7 applications: 2 responses (28.571%), 1 interview (14.285%), 0 offers
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '7',
            responded: '2',
            interviews: '1',
            offers: '0',
            active: '3',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '12.456' }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };

        const metrics = await analyticsService.calculateMetrics('user-6', dateRange);

        expect(metrics.applicationsSent).toBe(7);
        expect(metrics.responseRate).toBe(28.6); // Rounded from 28.571
        expect(metrics.interviewRate).toBe(14.3); // Rounded from 14.285
        expect(metrics.offerRate).toBe(0);
        expect(metrics.averageResponseTime).toBe(12.5); // Rounded from 12.456
      });
    });

    describe('Edge Cases', () => {
      it('should handle null average response time', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '5',
            responded: '0',
            interviews: '0',
            offers: '0',
            active: '5',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: null }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };

        const metrics = await analyticsService.calculateMetrics('user-7', dateRange);

        expect(metrics.averageResponseTime).toBe(0);
      });

      it('should handle string numbers from database', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '25',
            responded: '10',
            interviews: '5',
            offers: '1',
            active: '12',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '10.5' }],
        });

        const dateRange = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };

        const metrics = await analyticsService.calculateMetrics('user-8', dateRange);

        expect(metrics.applicationsSent).toBe(25);
        expect(metrics.responseRate).toBe(40);
        expect(metrics.interviewRate).toBe(20);
        expect(metrics.offerRate).toBe(4);
      });
    });
  });

  describe('getBenchmarkComparison - Accuracy Tests', () => {
    describe('User Above Average', () => {
      it('should correctly identify user performing above platform average', async () => {
        // User metrics query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '30',
            responded: '18',
            interviews: '12',
            offers: '3',
            active: '5',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '8.5' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.5',
            avg_interview_rate: '18.2',
            avg_offer_rate: '5.1',
            avg_applications_sent: '28.3',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '75.5' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-1');

        expect(comparison.userMetrics.responseRate).toBe(60); // 18/30
        expect(comparison.platformAverage.responseRate).toBe(35.5);
        expect(comparison.percentile).toBe(76); // Rounded from 75.5

        // User is above average
        const responseComparison = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComparison?.performance).toBe('above');
        expect(responseComparison?.userValue).toBe(60);
        expect(responseComparison?.avgValue).toBe(35.5);
      });
    });

    describe('User Below Average', () => {
      it('should correctly identify user performing below platform average', async () => {
        // User metrics query - poor performance
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '50',
            responded: '5',
            interviews: '2',
            offers: '0',
            active: '10',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '25.3' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.0',
            avg_interview_rate: '18.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '15.2' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-2');

        expect(comparison.userMetrics.responseRate).toBe(10); // 5/50
        expect(comparison.platformAverage.responseRate).toBe(35);
        expect(comparison.percentile).toBe(15);

        // User is below average
        const responseComparison = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComparison?.performance).toBe('below');
        expect(responseComparison?.userValue).toBe(10);
        expect(responseComparison?.avgValue).toBe(35);
      });
    });

    describe('User At Average', () => {
      it('should correctly identify user performing at platform average', async () => {
        // User metrics query - average performance
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '30',
            responded: '11',
            interviews: '6',
            offers: '2',
            active: '8',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '14.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '6.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '52.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-3');

        expect(comparison.userMetrics.responseRate).toBe(36.7); // 11/30 rounded
        expect(comparison.platformAverage.responseRate).toBe(35);
        expect(comparison.percentile).toBe(52);

        // User is at average (within 10% difference)
        const responseComparison = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComparison?.performance).toBe('average');
      });
    });

    describe('Multiple Metrics Comparison', () => {
      it('should compare all three key metrics correctly', async () => {
        // User metrics query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '40',
            responded: '20',
            interviews: '12',
            offers: '4',
            active: '10',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '10.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '68.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-4');

        expect(comparison.comparison).toHaveLength(3);

        // Response Rate: 50% vs 35% = above
        const responseComp = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComp?.userValue).toBe(50);
        expect(responseComp?.avgValue).toBe(35);
        expect(responseComp?.performance).toBe('above');

        // Interview Rate: 30% vs 20% = above
        const interviewComp = comparison.comparison.find(c => c.metric === 'Interview Rate');
        expect(interviewComp?.userValue).toBe(30);
        expect(interviewComp?.avgValue).toBe(20);
        expect(interviewComp?.performance).toBe('above');

        // Offer Rate: 10% vs 5% = above
        const offerComp = comparison.comparison.find(c => c.metric === 'Offer Rate');
        expect(offerComp?.userValue).toBe(10);
        expect(offerComp?.avgValue).toBe(5);
        expect(offerComp?.performance).toBe('above');
      });
    });

    describe('Percentile Calculation', () => {
      it('should calculate correct percentile for top performer', async () => {
        // User metrics query - excellent performance
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '25',
            responded: '20',
            interviews: '15',
            offers: '5',
            active: '5',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '5.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query - top 5%
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '95.3' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-5');

        expect(comparison.percentile).toBe(95);
        expect(comparison.userMetrics.responseRate).toBe(80); // 20/25
      });

      it('should calculate correct percentile for bottom performer', async () => {
        // User metrics query - poor performance
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '60',
            responded: '3',
            interviews: '1',
            offers: '0',
            active: '15',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '30.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query - bottom 10%
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '8.7' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-6');

        expect(comparison.percentile).toBe(9);
        expect(comparison.userMetrics.responseRate).toBe(5); // 3/60
      });
    });

    describe('Performance Threshold Logic', () => {
      it('should mark as "above" when user is >10% better than average', async () => {
        // User metrics query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '30',
            responded: '15',
            interviews: '9',
            offers: '3',
            active: '8',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '10.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '40.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '65.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-7');

        // User: 50%, Platform: 40%, Difference: +25% (above 10% threshold)
        const responseComp = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComp?.performance).toBe('above');
      });

      it('should mark as "below" when user is >10% worse than average', async () => {
        // User metrics query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '30',
            responded: '8',
            interviews: '4',
            offers: '1',
            active: '10',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '18.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '40.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '35.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-8');

        // User: 26.7%, Platform: 40%, Difference: -33.25% (below -10% threshold)
        const responseComp = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComp?.performance).toBe('below');
      });

      it('should mark as "average" when user is within ±10% of average', async () => {
        // User metrics query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '30',
            responded: '13',
            interviews: '7',
            offers: '2',
            active: '9',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '14.0' }],
        });

        // Platform averages query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '40.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '50.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-9');

        // User: 43.3%, Platform: 40%, Difference: +8.25% (within ±10%)
        const responseComp = comparison.comparison.find(c => c.metric === 'Response Rate');
        expect(responseComp?.performance).toBe('average');
      });
    });

    describe('Edge Cases', () => {
      it('should handle user with insufficient data (< 5 applications)', async () => {
        // User metrics query - only 3 applications
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '3',
            responded: '1',
            interviews: '0',
            offers: '0',
            active: '2',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: null }],
        });

        // Platform averages query - should still work
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: '35.0',
            avg_interview_rate: '20.0',
            avg_offer_rate: '5.0',
            avg_applications_sent: '30.0',
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '50.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-10');

        expect(comparison.userMetrics.applicationsSent).toBe(3);
        expect(comparison.platformAverage).toBeDefined();
        expect(comparison.comparison).toHaveLength(3);
      });

      it('should handle null platform averages gracefully', async () => {
        // User metrics query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            applications_sent: '20',
            responded: '10',
            interviews: '5',
            offers: '1',
            active: '8',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ avg_response_days: '12.0' }],
        });

        // Platform averages query - no data
        mockQuery.mockResolvedValueOnce({
          rows: [{
            avg_response_rate: null,
            avg_interview_rate: null,
            avg_offer_rate: null,
            avg_applications_sent: null,
          }],
        });

        // Percentile query
        mockQuery.mockResolvedValueOnce({
          rows: [{ percentile: '50.0' }],
        });

        const comparison = await analyticsService.getBenchmarkComparison('user-11');

        expect(comparison.platformAverage.responseRate).toBe(0);
        expect(comparison.platformAverage.interviewRate).toBe(0);
        expect(comparison.platformAverage.offerRate).toBe(0);
      });
    });
  });
});

describe('Analytics Export Service', () => {
  describe('CSV Export', () => {
    it('should have CSV export functionality', () => {
      expect(typeof analyticsExportService.exportToCSV).toBe('function');
    });
  });

  describe('PDF Export', () => {
    it('should have PDF export functionality', () => {
      expect(typeof analyticsExportService.exportToPDF).toBe('function');
    });
  });
});
