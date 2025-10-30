'use client';

import { TrendData } from '@/stores/analytics.store';

interface TrendChartsProps {
  trends: TrendData[];
}

export function TrendCharts({ trends }: TrendChartsProps) {
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderChart = (trend: TrendData) => {
    if (!trend.data || trend.data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-400">
          No data available
        </div>
      );
    }

    const maxValue = Math.max(...trend.data.map((d) => d.value), 1);
    const minValue = Math.min(...trend.data.map((d) => d.value), 0);
    const range = maxValue - minValue || 1;

    return (
      <div className="relative h-48 mt-4">
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = 200 - (percent * 2);
            const value = minValue + (range * percent) / 100;
            return (
              <g key={percent}>
                <line
                  x1="40"
                  y1={y}
                  x2="800"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x="35"
                  y={y + 4}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* Line chart */}
          <polyline
            points={trend.data
              .map((item, index) => {
                const x = 40 + (index / (trend.data.length - 1)) * 760;
                const normalizedValue = ((item.value - minValue) / range) * 200;
                const y = 200 - normalizedValue;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {trend.data.map((item, index) => {
            const x = 40 + (index / (trend.data.length - 1)) * 760;
            const normalizedValue = ((item.value - minValue) / range) * 200;
            const y = 200 - normalizedValue;
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-10 text-xs text-gray-500">
          {trend.data.map((item, index) => {
            // Show only first, middle, and last labels to avoid crowding
            if (
              index === 0 ||
              index === Math.floor(trend.data.length / 2) ||
              index === trend.data.length - 1
            ) {
              return <span key={index}>{formatDate(item.date)}</span>;
            }
            return <span key={index} />;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Trends Over Time</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trends.map((trend, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">{trend.metric}</h3>
              <div className={`flex items-center gap-1 ${getTrendColor(trend.direction)}`}>
                {getTrendIcon(trend.direction)}
                <span className="text-sm font-medium">
                  {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                </span>
              </div>
            </div>
            {renderChart(trend)}
          </div>
        ))}
      </div>
    </div>
  );
}
