'use client';

import { useEffect } from 'react';
import { useJobsStore } from '@/stores/jobs.store';
import { useRouter } from 'next/navigation';

export default function SavedJobsPage() {
  const router = useRouter();
  const { savedJobs, isLoading, getSavedJobs, unsaveJob } = useJobsStore();

  useEffect(() => {
    getSavedJobs();
  }, [getSavedJobs]);

  const handleUnsave = async (jobId: string) => {
    try {
      await unsaveJob(jobId);
    } catch (error) {
      console.error('Failed to unsave job:', error);
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `$${(min / 1000).toFixed(0)}k+`;
    return `Up to $${(max! / 1000).toFixed(0)}k`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Jobs</h1>
          <p className="text-gray-600 mt-1">
            {savedJobs.length} {savedJobs.length === 1 ? 'job' : 'jobs'} saved
          </p>
        </div>
        <button
          onClick={() => router.push('/jobs')}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Browse Jobs
        </button>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No saved jobs</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start saving jobs you're interested in to keep track of them here.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/jobs')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {savedJobs.map((job) => (
            <div key={job.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                        onClick={() => router.push(`/jobs/${job.id}`)}
                      >
                        {job.title}
                      </h3>
                      <p className="text-lg text-gray-700 mt-1">{job.company}</p>
                    </div>
                    {job.matchScore !== undefined && (
                      <div className="ml-4 text-right">
                        <div className={`text-2xl font-bold ${getMatchScoreColor(job.matchScore)}`}>
                          {job.matchScore}%
                        </div>
                        <div className="text-xs text-gray-500">Match</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {job.location}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {job.jobType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {job.remoteType.charAt(0).toUpperCase() + job.remoteType.slice(1)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatSalary(job.salaryMin, job.salaryMax)}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Posted {formatDate(job.postedDate)}
                    </div>
                  </div>

                  <p className="mt-3 text-gray-600 line-clamp-2">{job.description}</p>

                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.requirements.slice(0, 5).map((req, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {req}
                        </span>
                      ))}
                      {job.requirements.length > 5 && (
                        <span className="px-2 py-1 text-gray-500 text-xs">
                          +{job.requirements.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Details
                </button>
                <button
                  onClick={() => router.push(`/applications/new?jobId=${job.id}`)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Track Application
                </button>
                <button
                  onClick={() => handleUnsave(job.id)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
