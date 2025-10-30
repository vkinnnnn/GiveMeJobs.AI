'use client';

import { ResponseAnalysis } from '@/stores/interview-prep.store';

interface ResponseFeedbackProps {
  analysis: ResponseAnalysis;
  onClose: () => void;
  onPracticeAgain?: () => void;
}

export function ResponseFeedback({ analysis, onClose, onPracticeAgain }: ResponseFeedbackProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Response Feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(
                analysis.overallScore
              )}`}
            >
              <div>
                <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}
                </div>
                <div className={`text-sm font-medium ${getScoreColor(analysis.overallScore)}`}>
                  {getScoreLabel(analysis.overallScore)}
                </div>
              </div>
            </div>
            <p className="mt-4 text-gray-600">Overall Response Score</p>
          </div>

          {/* Score Breakdown */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Clarity</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.clarity)}`}>
                    {analysis.clarity}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.clarity >= 80
                        ? 'bg-green-500'
                        : analysis.clarity >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.clarity}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Relevance</span>
                  <span className={`text-sm font-semibold ${getScoreColor(analysis.relevance)}`}>
                    {analysis.relevance}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.relevance >= 80
                        ? 'bg-green-500'
                        : analysis.relevance >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.relevance}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">STAR Method Usage</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    analysis.starMethodUsage
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {analysis.starMethodUsage ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-green-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-green-900 mb-2">Strengths</h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-green-800">
                        • {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Areas for Improvement */}
          {analysis.areasForImprovement && analysis.areasForImprovement.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-orange-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-orange-900 mb-2">
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {analysis.areasForImprovement.map((area, index) => (
                      <li key={index} className="text-sm text-orange-800">
                        • {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-blue-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-blue-900 mb-2">
                    Suggestions for Next Time
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-blue-800">
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Keywords Covered */}
          {analysis.keywordsCovered && analysis.keywordsCovered.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Keywords Covered</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.keywordsCovered.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Indicators */}
          {analysis.confidenceIndicators && analysis.confidenceIndicators.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Confidence Indicators</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.confidenceIndicators.map((indicator, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {indicator}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {onPracticeAgain && (
              <button
                onClick={onPracticeAgain}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Practice Again
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
