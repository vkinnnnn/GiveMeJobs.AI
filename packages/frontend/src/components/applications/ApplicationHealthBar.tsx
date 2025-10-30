'use client';

import { ApplicationStatus } from '@/stores/applications.store';

interface ApplicationHealthBarProps {
  currentStatus: ApplicationStatus;
  appliedDate: Date;
}

interface Stage {
  name: string;
  status: ApplicationStatus;
  label: string;
}

const stages: Stage[] = [
  { name: 'Applied', status: ApplicationStatus.APPLIED, label: 'Applied' },
  { name: 'Screening', status: ApplicationStatus.SCREENING, label: 'Screening' },
  { name: 'Interview', status: ApplicationStatus.INTERVIEW_SCHEDULED, label: 'Interview' },
  { name: 'Offer', status: ApplicationStatus.OFFER_RECEIVED, label: 'Offer' },
  { name: 'Accepted', status: ApplicationStatus.ACCEPTED, label: 'Accepted' },
];

export function ApplicationHealthBar({ currentStatus, appliedDate }: ApplicationHealthBarProps) {
  // Determine current stage index
  const getCurrentStageIndex = (): number => {
    switch (currentStatus) {
      case ApplicationStatus.SAVED:
        return -1;
      case ApplicationStatus.APPLIED:
        return 0;
      case ApplicationStatus.SCREENING:
        return 1;
      case ApplicationStatus.INTERVIEW_SCHEDULED:
      case ApplicationStatus.INTERVIEW_COMPLETED:
        return 2;
      case ApplicationStatus.OFFER_RECEIVED:
        return 3;
      case ApplicationStatus.ACCEPTED:
        return 4;
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.WITHDRAWN:
        return -1; // Special handling for terminal states
      default:
        return -1;
    }
  };

  const currentStageIndex = getCurrentStageIndex();
  const isTerminalState =
    currentStatus === ApplicationStatus.REJECTED ||
    currentStatus === ApplicationStatus.WITHDRAWN;

  // Calculate progress percentage
  const calculateProgress = (): number => {
    if (isTerminalState) return 0;
    if (currentStageIndex === -1) return 0;
    return ((currentStageIndex + 1) / stages.length) * 100;
  };

  const progressPercentage = calculateProgress();

  // Calculate days since applied
  const daysSinceApplied = Math.floor(
    (new Date().getTime() - new Date(appliedDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Application Progress</h3>
          <span className="text-sm text-gray-600">{daysSinceApplied} days</span>
        </div>

        {isTerminalState ? (
          <div className="text-center py-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
                currentStatus === ApplicationStatus.REJECTED
                  ? 'bg-red-100'
                  : 'bg-gray-100'
              }`}
            >
              <svg
                className={`w-8 h-8 ${
                  currentStatus === ApplicationStatus.REJECTED
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {currentStatus === ApplicationStatus.REJECTED ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {currentStatus === ApplicationStatus.REJECTED ? 'Application Rejected' : 'Application Withdrawn'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              This application is no longer active
            </p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="relative">
              <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200">
                <div
                  style={{ width: `${progressPercentage}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                />
              </div>
              <div className="text-right mt-1">
                <span className="text-xs font-semibold text-blue-600">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
            </div>

            {/* Stages */}
            <div className="mt-6">
              <div className="flex justify-between">
                {stages.map((stage, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const isPending = index > currentStageIndex;

                  return (
                    <div key={stage.status} className="flex flex-col items-center flex-1">
                      {/* Stage Circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-blue-600 border-blue-600'
                            : isCurrent
                            ? 'bg-blue-100 border-blue-600'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            className="w-6 h-6 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <span
                            className={`text-sm font-semibold ${
                              isCurrent ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Stage Label */}
                      <span
                        className={`mt-2 text-xs font-medium text-center ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {stage.label}
                      </span>

                      {/* Connector Line */}
                      {index < stages.length - 1 && (
                        <div
                          className={`absolute h-0.5 top-5 transition-all ${
                            isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          style={{
                            left: `${(index + 1) * (100 / stages.length)}%`,
                            width: `${100 / stages.length}%`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Stage Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {currentStageIndex === -1
                      ? 'Application saved'
                      : `Currently at: ${stages[currentStageIndex]?.label}`}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {currentStageIndex === stages.length - 1
                      ? 'Congratulations! You have completed all stages.'
                      : currentStageIndex === -1
                      ? 'Submit your application to start tracking progress.'
                      : `Next step: ${stages[currentStageIndex + 1]?.label}`}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
