'use client';

import { useEffect, useState } from 'react';
import { useAnalyticsStore } from '@/stores/analytics.store';
import { MetricsCards } from '@/components/analytics/MetricsCards';
import { TrendCharts } from '@/components/analytics/TrendCharts';
import { InsightsPanel } from '@/components/analytics/InsightsPanel';
import { BenchmarkComparison } from '@/components/analytics/BenchmarkComparison';
import { ExportPanel } from '@/components/analytics/ExportPanel';

export default function AnalyticsPage() {
  const { dashboard, benchmarks, loading, error, fetchDashboard, fetchBenchmarks, exportAnalytics, clearError } = useAnalyticsStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchDashboard(period);
    fetchBenchmarks();
  }, [period, fetchDashboard, fetchBenchmarks]);

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'quarter' | 'year') => {
    setPeriod(newPeriod);
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error loading analytics</h3>
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">
          Start applying to jobs to see your analytics and insights!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-1">Track your job search performance and get actionable insights</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <MetricsCards metrics={dashboard.metrics} />

      {/* Trends */}
      {dashboard.trends && dashboard.trends.length > 0 && (
        <TrendCharts trends={dashboard.trends} />
      )}

      {/* Insights */}
      {dashboard.insights && dashboard.insights.length > 0 && (
        <InsightsPanel insights={dashboard.insights} />
      )}

      {/* Benchmark Comparison */}
      {benchmarks && (
        <BenchmarkComparison benchmarks={benchmarks} />
      )}

      {/* Export Panel */}
      <ExportPanel onExport={exportAnalytics} loading={loading} />
    </div>
  );
}
