'use client';

import { AnalyticsMetrics } from '@/stores/analytics.store';

interface MetricsCardsProps {
  metrics: AnalyticsMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  
  const formatTime = (days: number) => {
    if (days < 1) return '< 1 day';
    return `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}`;
  };

  const metricCards = [
    {
      label: 'Applications Sent',
      value: metrics.applicationsSent,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: 'bg-blue-500',
      description: 'Total applications submitted',
    },
    {
      label: 'Response Rate',
      value: formatPercentage(metrics.responseRate),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      color: 'bg-green-500',
      description: 'Companies that responded',
    },
    {
      label: 'Interview Rate',
      value: formatPercentage(metrics.interviewRate),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: 'bg-purple-500',
      description: 'Applications leading to interviews',
    },
    {
      label: 'Offer Rate',
      value: formatPercentage(metrics.offerRate),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'bg-yellow-500',
      description: 'Applications resulting in offers',
    },
    {
      label: 'Avg Response Time',
      value: formatTime(metrics.averageResponseTime),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'bg-indigo-500',
      description: 'Time until company response',
    },
    {
      label: 'Active Applications',
      value: metrics.activeApplications,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'bg-pink-500',
      description: 'Currently in progress',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metricCards.map((card, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`${card.color} text-white p-3 rounded-lg`}>
              {card.icon}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm font-medium text-gray-700">{card.label}</p>
            <p className="text-xs text-gray-500">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
