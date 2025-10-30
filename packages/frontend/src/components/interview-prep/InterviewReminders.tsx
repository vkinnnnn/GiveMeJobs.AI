'use client';

import { Application } from '@/stores/applications.store';
import { useEffect, useState } from 'react';

interface InterviewRemindersProps {
  applications: Application[];
  onPrepare?: (applicationId: string) => void;
}

export function InterviewReminders({ applications, onPrepare }: InterviewRemindersProps) {
  const [upcomingInterviews, setUpcomingInterviews] = useState<Application[]>([]);

  useEffect(() => {
    // Filter applications with upcoming interviews
    const now = new Date();
    const upcoming = applications
      .filter((app) => {
        if (!app.interviewDate) return false;
        const interviewDate = new Date(app.interviewDate);
        const daysUntil = Math.ceil(
          (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil >= 0 && daysUntil <= 14; // Show interviews within next 14 days
      })
      .sort((a, b) => {
        const dateA = new Date(a.interviewDate!).getTime();
        const dateB = new Date(b.interviewDate!).getTime();
        return dateA - dateB;
      });

    setUpcomingInterviews(upcoming);
  }, [applications]);

  const getTimeUntilInterview = (interviewDate: Date) => {
    const now = new Date();
    const interview = new Date(interviewDate);
    const diffMs = interview.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours <= 0) return 'Today';
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getUrgencyColor = (interviewDate: Date) => {
    const now = new Date();
    const interview = new Date(interviewDate);
    const diffDays = Math.ceil((interview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'border-red-500 bg-red-50';
    if (diffDays <= 3) return 'border-orange-500 bg-orange-50';
    if (diffDays <= 7) return 'border-yellow-500 bg-yellow-50';
    return 'border-blue-500 bg-blue-50';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getPreparationChecklist = (daysUntil: number) => {
    const now = new Date();
    const interview = new Date();
    interview.setDate(now.getDate() + daysUntil);

    const checklist = [
      { task: 'Review company research', completed: false },
      { task: 'Practice common interview questions', completed: false },
      { task: 'Prepare questions to ask interviewer', completed: false },
      { task: 'Review your resume and application', completed: false },
      { task: 'Test video call setup (if virtual)', completed: false },
      { task: 'Plan your outfit', completed: false },
      { task: 'Get directions/check location', completed: false },
    ];

    // Adjust checklist based on time remaining
    if (daysUntil <= 1) {
      return checklist.slice(0, 5); // Focus on essentials
    }
    return checklist;
  };

  if (upcomingInterviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming interviews</h3>
        <p className="mt-1 text-sm text-gray-500">
          Interviews scheduled within the next 14 days will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcomingInterviews.map((application) => {
        const daysUntil = Math.ceil(
          (new Date(application.interviewDate!).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const checklist = getPreparationChecklist(daysUntil);

        return (
          <div
            key={application.id}
            className={`border-l-4 rounded-lg shadow-sm ${getUrgencyColor(
              application.interviewDate!
            )}`}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Interview Scheduled
                    </h3>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      {getTimeUntilInterview(application.interviewDate!)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Application #{application.id.slice(0, 8)}
                  </p>
                </div>
                {onPrepare && (
                  <button
                    onClick={() => onPrepare(application.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Prepare Now
                  </button>
                )}
              </div>

              {/* Interview Details */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-gray-400"
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
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(application.interviewDate!)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-gray-400"
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
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(application.interviewDate!)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Countdown */}
              <div className="bg-white rounded-lg p-4 mb-4 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {getTimeUntilInterview(application.interviewDate!)}
                </div>
                <p className="text-sm text-gray-600 mt-1">until your interview</p>
              </div>

              {/* Preparation Checklist */}
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Preparation Checklist
                </h4>
                <div className="space-y-2">
                  {checklist.map((item, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          // In a real implementation, this would update the checklist state
                          console.log('Toggle checklist item:', item.task);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{item.task}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
