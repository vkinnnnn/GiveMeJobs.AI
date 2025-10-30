'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInterviewPrepStore, InterviewQuestion } from '@/stores/interview-prep.store';
import { useApplicationsStore } from '@/stores/applications.store';
import { InterviewQuestions } from '@/components/interview-prep/InterviewQuestions';
import { CompanyResearch } from '@/components/interview-prep/CompanyResearch';
import { InterviewTips } from '@/components/interview-prep/InterviewTips';
import { PracticeMode } from '@/components/interview-prep/PracticeMode';
import { ResponseFeedback } from '@/components/interview-prep/ResponseFeedback';
import { InterviewReminders } from '@/components/interview-prep/InterviewReminders';
import { getErrorMessage } from '@/lib/api-client';

export default function InterviewPrepPage() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  
  const { currentPrep, currentSession, isLoading, generateInterviewPrep, getInterviewPrep, submitPracticeResponse } = useInterviewPrepStore();
  const { applications, getApplications } = useApplicationsStore();
  
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(applicationId || '');
  const [error, setError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'research' | 'tips'>('questions');
  const [practiceQuestion, setPracticeQuestion] = useState<InterviewQuestion | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showReminders, setShowReminders] = useState(true);

  useEffect(() => {
    getApplications().catch((err) => {
      setError(getErrorMessage(err));
    });
  }, [getApplications]);

  useEffect(() => {
    if (applicationId) {
      setSelectedApplicationId(applicationId);
      loadInterviewPrep(applicationId);
    }
  }, [applicationId]);

  const loadInterviewPrep = async (appId: string) => {
    try {
      setError('');
      await getInterviewPrep(appId);
    } catch (err) {
      // If prep doesn't exist, that's okay - user can generate it
      console.log('No existing prep found');
    }
  };

  const handleGenerate = async () => {
    if (!selectedApplicationId) {
      setError('Please select an application');
      return;
    }

    try {
      setError('');
      setIsGenerating(true);
      await generateInterviewPrep(selectedApplicationId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplicationChange = (appId: string) => {
    setSelectedApplicationId(appId);
    if (appId) {
      loadInterviewPrep(appId);
    }
  };

  const handlePractice = (questionId: string) => {
    const question = currentPrep?.questions.find((q) => q.id === questionId);
    if (question) {
      setPracticeQuestion(question);
    }
  };

  const handleSubmitPractice = async (response: string) => {
    if (!currentPrep || !practiceQuestion) return;

    try {
      await submitPracticeResponse(currentPrep.id, practiceQuestion.id, response);
      setPracticeQuestion(null);
      setShowFeedback(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClosePractice = () => {
    setPracticeQuestion(null);
  };

  const handleCloseFeedback = () => {
    setShowFeedback(false);
  };

  const handlePracticeAgain = () => {
    setShowFeedback(false);
    if (currentSession) {
      const question = currentPrep?.questions.find((q) => q.id === currentSession.questionId);
      if (question) {
        setPracticeQuestion(question);
      }
    }
  };

  const handlePrepareFromReminder = (appId: string) => {
    setSelectedApplicationId(appId);
    loadInterviewPrep(appId);
    setShowReminders(false);
  };

  // Filter applications that have interview scheduled or completed
  const interviewApplications = applications.filter(
    (app) =>
      app.status === 'interview_scheduled' ||
      app.status === 'interview_completed' ||
      app.status === 'screening'
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Preparation</h1>
        <p className="text-gray-600">
          Prepare for your interviews with AI-generated questions and company research
        </p>
      </div>

      {/* Interview Reminders Section */}
      {showReminders && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Interviews</h2>
            <button
              onClick={() => setShowReminders(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          <InterviewReminders
            applications={applications}
            onPrepare={handlePrepareFromReminder}
          />
        </div>
      )}

      {!showReminders && (
        <button
          onClick={() => setShowReminders(true)}
          className="mb-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Show Upcoming Interviews
        </button>
      )}

      {/* Application Selector */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="application" className="block text-sm font-medium text-gray-700 mb-2">
              Select Application
            </label>
            <select
              id="application"
              value={selectedApplicationId}
              onChange={(e) => handleApplicationChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose an application...</option>
              {interviewApplications.map((app) => (
                <option key={app.id} value={app.id}>
                  Application #{app.id.slice(0, 8)} - {app.status}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedApplicationId || isGenerating || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isGenerating ? 'Generating...' : currentPrep ? 'Regenerate' : 'Generate Prep'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Interview Prep Content */}
      {!isLoading && currentPrep && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'questions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Interview Questions ({currentPrep.questions.length})
                </button>
                <button
                  onClick={() => setActiveTab('research')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'research'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Company Research
                </button>
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'tips'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Tips ({currentPrep.tips.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'questions' && (
                <InterviewQuestions questions={currentPrep.questions} onPractice={handlePractice} />
              )}
              {activeTab === 'research' && (
                <CompanyResearch research={currentPrep.companyResearch} />
              )}
              {activeTab === 'tips' && <InterviewTips tips={currentPrep.tips} />}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !currentPrep && selectedApplicationId && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No interview prep generated</h3>
          <p className="mt-1 text-sm text-gray-500">
            Click the Generate Prep button to create interview preparation materials
          </p>
        </div>
      )}

      {!isLoading && !currentPrep && !selectedApplicationId && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select an application</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose an application to generate interview preparation materials
          </p>
        </div>
      )}

      {/* Practice Mode Modal */}
      {practiceQuestion && (
        <PracticeMode
          question={practiceQuestion}
          onSubmit={handleSubmitPractice}
          onClose={handleClosePractice}
        />
      )}

      {/* Feedback Modal */}
      {showFeedback && currentSession?.analysis && (
        <ResponseFeedback
          analysis={currentSession.analysis}
          onClose={handleCloseFeedback}
          onPracticeAgain={handlePracticeAgain}
        />
      )}
    </div>
  );
}
