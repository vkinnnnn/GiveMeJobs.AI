'use client';

import { useState, useEffect } from 'react';
import { useJobsStore } from '@/stores/jobs.store';
import { useRouter } from 'next/navigation';
import { Job } from '@/../../shared-types/src/job';

export default function JobsPage() {
  const router = useRouter();
  const { jobs, isLoading, totalPages, currentPage, searchJobs, saveJob, unsaveJob, savedJobs, getSavedJobs } = useJobsStore();
  
  const [searchQuery, setSearchQuery] = useState({
    keywords: '',
    location: '',
    remoteType: [] as string[],
    jobType: [] as string[],
    salaryMin: undefined as number | undefined,
    page: 1,
    limit: 10,
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getSavedJobs();
  }, [getSavedJobs]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery.page]);

  const handleSearch = async () => {
    try {
      await searchJobs(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setSearchQuery(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const toggleArrayFilter = (key: 'remoteType' | 'jobType', value: string) => {
    setSearchQuery(prev => {
      const array = prev[key];
      const newArray = array.includes(value)
        ? array.filter(v => v !== value)
        : [...array, value];
      return { ...prev, [key]: newArray, page: 1 };
    });
  };

  const handlePageChange = (page: number) => {
    setSearchQuery(prev => ({ ...prev, page }));
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Job Search</h1>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Job title, keywords, or company"
              value={searchQuery.keywords}
              onChange={(e) => handleFilterChange('keywords', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="w-64">
            <input
              type="text"
              placeholder="Location"
              value={searchQuery.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remote Type</label>
              <div className="flex gap-2">
                {['remote', 'hybrid', 'onsite'].map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleArrayFilter('remoteType', type)}
                    className={`px-4 py-2 rounded-lg border ${
                      searchQuery.remoteType.includes(type)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
              <div className="flex gap-2">
                {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleArrayFilter('jobType', type)}
                    className={`px-4 py-2 rounded-lg border ${
                      searchQuery.jobType.includes(type)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary</label>
              <input
                type="number"
                placeholder="e.g., 50000"
                value={searchQuery.salaryMin || ''}
                onChange={(e) => handleFilterChange('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Searching for jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500">
              Showing {jobs.length} jobs
            </div>
            {jobs.map((job) => (
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
                    onClick={() => handleSaveToggle(job.id)}
                    className={`px-4 py-2 rounded-lg border ${
                      isJobSaved(job.id)
                        ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={isJobSaved(job.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
