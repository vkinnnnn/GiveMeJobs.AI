'use client';

import { useState } from 'react';

interface ExportPanelProps {
  onExport: (format: 'csv' | 'pdf', period: 'week' | 'month' | 'quarter' | 'year') => Promise<void>;
  loading: boolean;
}

export function ExportPanel({ onExport, loading }: ExportPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      await onExport(format, selectedPeriod);
    } finally {
      setIsExporting(false);
    }
  };

  const periods = [
    { value: 'week' as const, label: 'Last Week' },
    { value: 'month' as const, label: 'Last Month' },
    { value: 'quarter' as const, label: 'Last Quarter' },
    { value: 'year' as const, label: 'Last Year' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Export Analytics</h2>
          <p className="text-sm text-gray-600">
            Download your job search analytics in CSV or PDF format
          </p>
        </div>
        <div className="bg-blue-50 p-2 rounded-lg">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-6">
        {/* Date Range Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Time Period
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                disabled={isExporting || loading}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  selectedPeriod === period.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                } ${
                  isExporting || loading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV Export */}
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting || loading}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                isExporting || loading
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">Export as CSV</p>
                  <p className="text-xs text-gray-600">Spreadsheet format for data analysis</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* PDF Export */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting || loading}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                isExporting || loading
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">Export as PDF</p>
                  <p className="text-xs text-gray-600">Professional report with charts</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Export Status */}
        {isExporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">Preparing your export...</p>
                <p className="text-xs text-blue-700">This may take a few moments</p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">What&apos;s included in the export?</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                <li>All key metrics (applications, response rates, interview rates)</li>
                <li>Trend data for the selected time period</li>
                <li>Benchmark comparisons with platform averages</li>
                <li>PDF exports include visual charts and graphs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
