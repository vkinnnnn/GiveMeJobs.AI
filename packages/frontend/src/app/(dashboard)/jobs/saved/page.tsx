'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJobsStore } from '@/stores/jobs.store';

export default function SavedJobsPage() {
  const router = useRouter();
  const { savedJobs, isLoading, getSavedJobs, unsaveJob } = useJobsStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    getSavedJobs();
  }, [getSavedJobs]);

  const filteredAndSortedJobs = savedJobs
    .filter((job) => {
      if (!searchQuery) return true;
      return (
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        case 'date-asc':
          return new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime();
        case 'match-desc':
          return (b.matchScore || 0) - (a.matchScore || 0);
        case 'company':
          return a.company.localeCompare(b.company);
        default:
          return 0;
      }
    });

  const handleUnsave = async (jobId: string) => {
    try {
      await unsaveJob(jobId);
    } catch (error) {
      console.error('Failed to unsave job:', error);
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `${(min / 1000).toFixed(0)}k - ${(max / 1000).toFixed(0)}k`;
    if (min) return `${(min / 1000).toFixed(0)}k+`;
    return `Up to ${(max! / 1000).toFixed(0)}k`;
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Jobs</h1>
        <p className="text-gray-600">
          Jobs you&apos;ve saved for later review and application
        </p>
      </div>

      {/* Search and Sort */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search saved jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="match-desc">Best Match</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading saved jobs...</p>
        </div>
      ) : filteredAndSortedJobs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery ? 'No matching saved jobs' : 'No saved jobs yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Start saving jobs you\'re interested in to see them here'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/jobs')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Jobs
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-600 mb-4">
            {filteredAndSortedJobs.length} saved job{filteredAndSortedJobs.length !== 1 ? 's' : ''}
          </div>
          
          <div className="space-y-4">
            {filteredAndSortedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
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
                    </div>

                    <p className="mt-3 text-gray-600 line-clamp-2">{job.description}</p>

                    <div className="mt-3 text-sm text-gray-500">
                      Posted: {new Date(job.postedDate).toLocaleDateString()}
                      {job.applicationDeadline && (
                        <span className="ml-4">
                          Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
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
                    onClick={() => router.push(`/documents/generate?jobId=${job.id}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Generate Resume
                  </button>
                  <button
                    onClick={() => handleUnsave(job.id)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    title="Remove from saved jobs"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}