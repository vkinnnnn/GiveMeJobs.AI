'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApplicationsStore, ApplicationStatus, OfferDetails } from '@/stores/applications.store';
import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline';
import { ApplicationNotes } from '@/components/applications/ApplicationNotes';
import { ApplicationHealthBar } from '@/components/applications/ApplicationHealthBar';
import { StatusUpdateModal } from '@/components/applications/StatusUpdateModal';

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

export default function ApplicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentApplication, isLoading, getApplicationById, addNote, updateApplicationStatus } =
    useApplicationsStore();
  const applicationId = params.id as string;
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (applicationId) {
      getApplicationById(applicationId);
    }
  }, [applicationId, getApplicationById]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAddNote = async (note: { content: string; type: string }) => {
    await addNote(applicationId, note);
  };

  const handleStatusUpdate = async (status: ApplicationStatus, offerDetails?: OfferDetails) => {
    await updateApplicationStatus(applicationId, status);
    // Note: In a real implementation, you'd also update offer details via a separate API call
    // For now, we're just updating the status
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentApplication) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h2>
        <p className="text-gray-600 mb-4">The application you're looking for doesn't exist.</p>
        <Link
          href="/applications"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Applications
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/applications"
          className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Applications
        </Link>
        <div className="flex justify-between items-start mt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Application Details
            </h1>
            <p className="text-gray-600">Application ID: {currentApplication.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                statusColors[currentApplication.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {statusLabels[currentApplication.status] || currentApplication.status}
            </span>
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Applied Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(currentApplication.appliedDate)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(currentApplication.lastUpdated)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Application Method</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {currentApplication.applicationMethod.replace('-', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentApplication.jobId}</dd>
              </div>
              {currentApplication.interviewDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Interview Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium text-purple-600">
                    {formatDateTime(currentApplication.interviewDate)}
                  </dd>
                </div>
              )}
              {currentApplication.followUpDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Follow-up Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(currentApplication.followUpDate)}
                  </dd>
                </div>
              )}
            </dl>

            {/* Documents */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Documents</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <svg
                    className="w-5 h-5 text-gray-400 mr-2"
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
                  <span className="text-gray-700">Resume ID: {currentApplication.resumeId}</span>
                </div>
                {currentApplication.coverLetterId && (
                  <div className="flex items-center text-sm">
                    <svg
                      className="w-5 h-5 text-gray-400 mr-2"
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
                    <span className="text-gray-700">Cover Letter ID: {currentApplication.coverLetterId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Offer Details */}
            {currentApplication.offerDetails && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Offer Details</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Salary</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      ${currentApplication.offerDetails.salary.toLocaleString()}
                    </dd>
                  </div>
                  {currentApplication.offerDetails.equity && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Equity</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {currentApplication.offerDetails.equity}
                      </dd>
                    </div>
                  )}
                  {currentApplication.offerDetails.benefits.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Benefits</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <ul className="list-disc list-inside">
                          {currentApplication.offerDetails.benefits.map((benefit, idx) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                  {currentApplication.offerDetails.startDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(currentApplication.offerDetails.startDate)}
                      </dd>
                    </div>
                  )}
                  {currentApplication.offerDetails.deadline && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Decision Deadline</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(currentApplication.offerDetails.deadline)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <ApplicationNotes
              notes={currentApplication.notes || []}
              onAddNote={handleAddNote}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Health Bar */}
          <ApplicationHealthBar
            currentStatus={currentApplication.status}
            appliedDate={currentApplication.appliedDate}
          />

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
            {currentApplication.timeline && currentApplication.timeline.length > 0 ? (
              <ApplicationTimeline timeline={currentApplication.timeline} />
            ) : (
              <p className="text-gray-500 text-sm">No timeline events yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <StatusUpdateModal
          currentStatus={currentApplication.status}
          onUpdate={handleStatusUpdate}
          onClose={() => setShowStatusModal(false)}
        />
      )}
    </div>
  );
}
