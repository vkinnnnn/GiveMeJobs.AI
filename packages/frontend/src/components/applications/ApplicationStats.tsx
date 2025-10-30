'use client';

import { ApplicationStats as Stats } from '@/stores/applications.store';

interface ApplicationStatsProps {
  stats: Stats;
}

export function ApplicationStats({ stats }: ApplicationStatsProps) {
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)} hours`;
    }
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const statCards = [
    {
      label: 'Total Applications',
      value: stats.total,
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
    },
    {
      label: 'Response Rate',
      value: formatPercentage(stats.responseRate),
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
    },
    {
      label: 'Interview Rate',
      value: formatPercentage(stats.interviewConversionRate),
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
    },
    {
      label: 'Offer Rate',
      value: formatPercentage(stats.offerRate),
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
    },
    {
      label: 'Avg Response Time',
      value: formatTime(stats.averageResponseTime),
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
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Statistics</h2>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} text-white p-2 rounded-lg`}>{stat.icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications by Status</h3>
        <div className="space-y-3">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const statusLabels: Record<string, string> = {
              saved: 'Saved',
              applied: 'Applied',
              screening: 'Screening',
              interview_scheduled: 'Interview Scheduled',
              interview_completed: 'Interview Completed',
              offer_received: 'Offer Received',
              accepted: 'Accepted',
              rejected: 'Rejected',
              withdrawn: 'Withdrawn',
            };

            const statusColors: Record<string, string> = {
              saved: 'bg-gray-500',
              applied: 'bg-blue-500',
              screening: 'bg-yellow-500',
              interview_scheduled: 'bg-purple-500',
              interview_completed: 'bg-indigo-500',
              offer_received: 'bg-green-500',
              accepted: 'bg-green-600',
              rejected: 'bg-red-500',
              withdrawn: 'bg-gray-400',
            };

            return (
              <div key={status}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {statusLabels[status] || status}
                  </span>
                  <span className="text-sm text-gray-600">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${statusColors[status] || 'bg-gray-500'} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
