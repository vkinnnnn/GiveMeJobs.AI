'use client';

import { BenchmarkComparison as BenchmarkData } from '@/stores/analytics.store';

interface BenchmarkComparisonProps {
  benchmarks: BenchmarkData;
}

export function BenchmarkComparison({ benchmarks }: BenchmarkComparisonProps) {
  const getPerformanceColor = (performance: 'above' | 'below' | 'average') => {
    switch (performance) {
      case 'above':
        return 'text-green-600';
      case 'below':
        return 'text-red-600';
      case 'average':
        return 'text-gray-600';
    }
  };

  const getPerformanceBadge = (performance: 'above' | 'below' | 'average') => {
    switch (performance) {
      case 'above':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Above Average
          </span>
        );
      case 'below':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Below Average
          </span>
        );
      case 'average':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Average
          </span>
        );
    }
  };

  const getPercentileMessage = (percentile: number) => {
    if (percentile >= 90) return 'Excellent! You\'re in the top 10%';
    if (percentile >= 75) return 'Great! You\'re performing better than most';
    if (percentile >= 50) return 'Good! You\'re above average';
    if (percentile >= 25) return 'Room for improvement';
    return 'Keep working on your job search strategy';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Benchmark Comparison</h2>

      {/* Percentile Ranking */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Percentile Ranking</h3>
            <p className="text-sm text-gray-600">
              Based on response rate compared to other users
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getPercentileColor(benchmarks.percentile)}`}>
              {benchmarks.percentile}
              <span className="text-2xl">th</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">percentile</p>
          </div>
        </div>
        
        {/* Percentile Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                benchmarks.percentile >= 75
                  ? 'bg-green-500'
                  : benchmarks.percentile >= 50
                  ? 'bg-blue-500'
                  : benchmarks.percentile >= 25
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${benchmarks.percentile}%` }}
            />
          </div>
          <p className={`text-sm font-medium ${getPercentileColor(benchmarks.percentile)}`}>
            {getPercentileMessage(benchmarks.percentile)}
          </p>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Your Performance vs Platform Average
        </h3>

        <div className="space-y-6">
          {benchmarks.comparison.map((item, index) => {
            const maxValue = Math.max(item.userValue, item.avgValue, 1);
            const userPercentage = (item.userValue / maxValue) * 100;
            const avgPercentage = (item.avgValue / maxValue) * 100;

            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{item.metric}</span>
                    {getPerformanceBadge(item.performance)}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full" />
                      <span className="text-gray-600">You: {item.userValue.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                      <span className="text-gray-600">Average: {item.avgValue.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Comparison Bars */}
                <div className="space-y-2">
                  {/* User Bar */}
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12">You</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${userPercentage}%` }}
                        >
                          {userPercentage > 15 && (
                            <span className="text-xs font-medium text-white">
                              {item.userValue.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {userPercentage <= 15 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                            {item.userValue.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Average Bar */}
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-12">Avg</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-gray-400 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${avgPercentage}%` }}
                        >
                          {avgPercentage > 15 && (
                            <span className="text-xs font-medium text-white">
                              {item.avgValue.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {avgPercentage <= 15 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                            {item.avgValue.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difference Indicator */}
                <div className="flex items-center gap-2 text-xs">
                  {item.performance === 'above' && (
                    <>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span className="text-green-600 font-medium">
                        {((item.userValue - item.avgValue) / item.avgValue * 100).toFixed(1)}% better than average
                      </span>
                    </>
                  )}
                  {item.performance === 'below' && (
                    <>
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className="text-red-600 font-medium">
                        {((item.avgValue - item.userValue) / item.avgValue * 100).toFixed(1)}% below average
                      </span>
                    </>
                  )}
                  {item.performance === 'average' && (
                    <>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                      </svg>
                      <span className="text-gray-600 font-medium">
                        On par with average
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Strengths</p>
              <p className="text-lg font-semibold text-gray-900">
                {benchmarks.comparison.filter(c => c.performance === 'above').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Metrics above platform average
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gray-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Average</p>
              <p className="text-lg font-semibold text-gray-900">
                {benchmarks.comparison.filter(c => c.performance === 'average').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Metrics on par with average
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Areas to Improve</p>
              <p className="text-lg font-semibold text-gray-900">
                {benchmarks.comparison.filter(c => c.performance === 'below').length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Metrics below platform average
          </p>
        </div>
      </div>
    </div>
  );
}
