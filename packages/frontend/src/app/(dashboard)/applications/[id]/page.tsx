'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApplicationsStore, ApplicationStatus } from '@/stores/applications.store';
import { ApplicationHealthBar } from '@/components/applications/ApplicationHealthBar';
import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline';
import { ApplicationNotes } from '@/components/applications/ApplicationNotes';
import { StatusUpdateModal } from '@/components/applications/StatusUpdateModal';

export default function ApplicationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;
  
  const { currentApplication, getApplicationById, updateApplicationStatus, addNote, isLoading } = useApplicationsStore();
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'general' | 'interview' | 'feedback' | 'follow-up'>('general');

  useEffect(() => {
    if (applicationId) {
      getApplicationById(applicationId);
    }
  }, [applicationId, getApplicationById]);

  const handleStatusUpdate = async (newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    
    try {
      await addNote(applicationId, {
        content: noteContent.trim(),
        type: noteType,
      });
      setNoteContent('');
      setShowAddNote(false);
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note. Please try again.');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ApplicationStatus) => {
    const colors = {
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
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    const labels = {
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
    return labels[status] || status;
  };

  if (isLoading || !currentApplication) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/applications')}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Applications
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Application #{currentApplication.id.slice(0, 8)}
            </h1>
            <p className="text-gray-600 mt-1">
              Applied on {formatDate(currentApplication.appliedDate)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentApplication.status)}`}>
              {getStatusLabel(currentApplication.status)}
            </span>
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Health Bar */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Progress</h2>
            <ApplicationHealthBar application={currentApplication} />
          </div>

          {/* Application Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Application Method</label>
                <p className="mt-1 text-gray-900 capitalize">
                  {currentApplication.applicationMethod.replace('_', ' ')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-gray-900">
                  {formatDate(currentApplication.lastUpdated)}
                </p>
              </div>
              
              {currentApplication.resumeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resume Used</label>
                  <p className="mt-1 text-blue-600 hover:text-blue-700">
                    <button onClick={() => router.push(`/documents/edit/${currentApplication.resumeId}`)}>
                      View Resume →
                    </button>
                  </p>
                </div>
              )}
              
              {currentApplication.coverLetterId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cover Letter Used</label>
                  <p className="mt-1 text-blue-600 hover:text-blue-700">
                    <button onClick={() => router.push(`/documents/edit/${currentApplication.coverLetterId}`)}>
                      View Cover Letter →
                    </button>
                  </p>
                </div>
              )}
              
              {currentApplication.interviewDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Interview Date</label>
                  <p className="mt-1 text-gray-900">
                    {formatDate(currentApplication.interviewDate)}
                  </p>
                </div>
              )}
              
              {currentApplication.followUpDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(currentApplication.followUpDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Offer Details */}
            {currentApplication.offerDetails && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Offer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700">Salary</label>
                    <p className="mt-1 text-green-900">
                      ${currentApplication.offerDetails.salary.toLocaleString()}
                    </p>
                  </div>
                  
                  {currentApplication.offerDetails.equity && (
                    <div>
                      <label className="block text-sm font-medium text-green-700">Equity</label>
                      <p className="mt-1 text-green-900">
                        {currentApplication.offerDetails.equity}
                      </p>
                    </div>
                  )}
                  
                  {currentApplication.offerDetails.startDate && (
                    <div>
                      <label className="block text-sm font-medium text-green-700">Start Date</label>
                      <p className="mt-1 text-green-900">
                        {new Date(currentApplication.offerDetails.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {currentApplication.offerDetails.deadline && (
                    <div>
                      <label className="block text-sm font-medium text-green-700">Response Deadline</label>
                      <p className="mt-1 text-green-900">
                        {new Date(currentApplication.offerDetails.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {currentApplication.offerDetails.benefits.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-green-700 mb-2">Benefits</label>
                    <ul className="list-disc list-inside text-green-900 space-y-1">
                      {currentApplication.offerDetails.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
            <ApplicationTimeline timeline={currentApplication.timeline} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/interview-prep?applicationId=${applicationId}`)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-left"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Interview Prep
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/documents/generate?jobId=${currentApplication.jobId}`)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-left"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Documents
                </div>
              </button>
              
              <button
                onClick={() => setShowAddNote(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Note
                </div>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              <span className="text-sm text-gray-500">
                {currentApplication.notes.length} note{currentApplication.notes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ApplicationNotes notes={currentApplication.notes} />
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

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Note</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Type
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="interview">Interview</option>
                  <option value="feedback">Feedback</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Content
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter your note here..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setNoteContent('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}