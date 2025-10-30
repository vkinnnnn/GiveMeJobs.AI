'use client';

import { useEffect } from 'react';
import { useJobsStore } from '@/stores/jobs.store';
import { useRouter } from 'next/navigation';

export default function JobRecommendations() {
  const router = useRouter();
  const { jobs, isLoading, getRecommendations, saveJob, unsaveJob, savedJobs, getSavedJobs } = useJobsStore();

  useEffect(() => {
    getRecommendations();
    getSavedJobs();
  }, [getRecommendations, getSavedJobs]);

  const isJobSaved = (jobId: string) => {
    return savedJobs.some(job => job.id === jobId);
  };

  const handleSaveToggle = async (jobId: string) => {
    try {
      if (isJobSaved(jobId)) {
        await unsaveJob(jobId);
      } else {
        await saveJob(jobId);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended Jobs</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended Jobs</h2>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">
            Complete your profile to get personalized job recommendations
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Recommended Jobs</h2>
        <button
          onClick={() => router.push('/jobs')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </button>
      </div>

      <div className="space-y-4">
        {jobs.slice(0, 5).map((job) => (
          <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 
                  className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  {job.title}
                </h3>
                <p className="text-sm text-gray-700 mt-1">{job.company}</p>
                
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatSalary(job.salaryMin, job.salaryMax)}
                  </div>
                </div>
              </div>

              {job.matchScore !== undefined && (
                <div className="ml-4 text-right">
                  <div className={`text-lg font-bold ${getMatchScoreColor(job.matchScore)}`}>
                    {job.matchScore}%
                  </div>
                  <div className="text-xs text-gray-500">Match</div>
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </button>
              <button
                onClick={() => handleSaveToggle(job.id)}
                className={`px-3 py-1.5 text-sm rounded border ${
                  isJobSaved(job.id)
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isJobSaved(job.id) ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {jobs.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/jobs')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View {jobs.length - 5} more recommendations →
          </button>
        </div>
      )}
    </div>
  );
}
