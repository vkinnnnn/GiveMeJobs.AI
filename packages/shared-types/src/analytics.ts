export interface AnalyticsDashboard {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  metrics: {
    applicationsSent: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    averageResponseTime: number;
    activeApplications: number;
  };
  trends: TrendData[];
  insights: Insight[];
  benchmarks: BenchmarkComparison;
}

export interface TrendData {
  metric: string;
  data: {
    date: Date;
    value: number;
  }[];
  change: number;
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
