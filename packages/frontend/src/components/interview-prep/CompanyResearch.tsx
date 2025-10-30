'use client';

import { CompanyResearch as CompanyResearchType } from '@/stores/interview-prep.store';

interface CompanyResearchProps {
  research: CompanyResearchType;
}

export function CompanyResearch({ research }: CompanyResearchProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Company Research</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Company Overview */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3">{research.companyName}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Industry:</span>
              <p className="text-sm text-gray-900 mt-1">{research.industry}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Company Size:</span>
              <p className="text-sm text-gray-900 mt-1">{research.size}</p>
            </div>
          </div>
        </div>

        {/* Company Values */}
        {research.values && research.values.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Company Values:</h4>
            <div className="flex flex-wrap gap-2">
              {research.values.map((value, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Company Culture */}
        {research.culture && research.culture.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Culture Highlights:</h4>
            <ul className="list-disc list-inside space-y-1">
              {research.culture.map((item, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interview Process */}
        {research.interviewProcess && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Interview Process:</h4>
            <p className="text-sm text-gray-700 whitespace-pre-line">{research.interviewProcess}</p>
          </div>
        )}

        {/* Recent News */}
        {research.recentNews && research.recentNews.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent News:</h4>
            <div className="space-y-3">
              {research.recentNews.map((news, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <a
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {news.title}
                  </a>
                  <p className="text-sm text-gray-600 mt-1">{news.summary}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(news.publishedDate)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
