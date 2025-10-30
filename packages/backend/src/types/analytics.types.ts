/**
 * Analytics Types
 * Type definitions for analytics and insights
 */

export interface AnalyticsDashboard {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  metrics: AnalyticsMetrics;
  trends: TrendData[];
  insights: Insight[];
  benchmarks?: BenchmarkComparison;
}

export interface AnalyticsMetrics {
  applicationsSent: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  averageResponseTime: number;
  activeApplications: number;
}

export interface TrendData {
  metric: string;
  data: {
    date: Date;
    value: number;
  }[];
  change: number; // Percentage change
  direction: 'up' | 'down' | 'stable';
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  actionable: boolean;
  recommendation?: string;
}

export interface BenchmarkComparison {
  userMetrics: Record<string, number>;
  platformAverage: Record<string, number>;
  percentile: number;
  comparison: {
    metric: string;
    userValue: number;
    avgValue: number;
    performance: 'above' | 'below' | 'average';
  }[];
}

export interface ApplicationAnalytics {
  bestDaysToApply: string[];
  mostResponsiveCompanies: string[];
  highestConvertingResumeFormats: string[];
  averageTimeToResponse: Record<string, number>;
  successRateByIndustry: Record<string, number>;
}

export interface AnalyticsExportOptions {
  format: 'csv' | 'pdf';
  period: 'week' | 'month' | 'quarter' | 'year';
  includeCharts?: boolean;
}
