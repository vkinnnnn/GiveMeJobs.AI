'use client';

import { Application } from '@/stores/applications.store';
import Link from 'next/link';

interface ApplicationCardProps {
  application: Application;
}

const statusColors: Record<string, string> = {
  saved: 'bg-gray-100 text-gray-800',
  applied: 'bg-blue-100 text-blue-800',
  screening: 'bg-yellow-100 text-yellow-800',
  interview_scheduled: 'bg-purple-100 text-purple-800',
  interview_completed: 'bg-indigo-100 text-indigo-800',
  offer_received: 'bg-green-100 text-green-800',
  accepted: 'bg-green-200 text-green-900',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-200 text-gray-700',
};

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

export function ApplicationCard({ application }: ApplicationCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const daysSinceApplied = Math.floor(
    (new Date().getTime() - new Date(application.appliedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link href={`/applications/${application.id}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Job Application #{application.id.slice(0, 8)}
            </h3>
            <p className="text-sm text-gray-500">Applied {formatDate(application.appliedDate)}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusColors[application.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {statusLabels[application.status] || application.status}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Last updated: {formatDate(application.lastUpdated)}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{daysSinceApplied} days since applied</span>
          </div>

          {application.interviewDate && (
            <div className="flex items-center text-purple-600 font-medium">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Interview: {formatDate(application.interviewDate)}</span>
            </div>
          )}

          {application.notes && application.notes.length > 0 && (
            <div className="flex items-center text-gray-500">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <span>{application.notes.length} note{application.notes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
