'use client';

import { Insight } from '@/stores/analytics.store';

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const getInsightIcon = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getInsightColors = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-900',
          text: 'text-green-800',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          text: 'text-yellow-800',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          text: 'text-blue-800',
        };
    }
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Insights & Recommendations</h2>
        <p className="text-gray-500 text-center py-8">
          No insights available yet. Keep applying to jobs to get personalized recommendations!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Insights & Recommendations</h2>
      
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const colors = getInsightColors(insight.type);
          
          return (
            <div
              key={index}
              className={`${colors.bg} ${colors.border} border rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                  {getInsightIcon(insight.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${colors.title} mb-1`}>
                    {insight.title}
                  </h3>
                  <p className={`text-sm ${colors.text} mb-2`}>
                    {insight.description}
                  </p>
                  
                  {insight.actionable && insight.recommendation && (
                    <div className={`mt-3 pt-3 border-t ${colors.border}`}>
                      <div className="flex items-start gap-2">
                        <svg
                          className={`w-4 h-4 ${colors.icon} flex-shrink-0 mt-0.5`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        <div>
                          <p className={`text-xs font-medium ${colors.title} mb-1`}>
                            Recommendation:
                          </p>
                          <p className={`text-xs ${colors.text}`}>
                            {insight.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
