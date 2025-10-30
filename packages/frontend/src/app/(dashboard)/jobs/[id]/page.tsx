'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useJobsStore } from '@/stores/jobs.store';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  const { 
    currentJob, 
    matchAnalysis, 
    isLoading, 
    getJobById, 
    getMatchAnalysis,
    saveJob,
    unsaveJob,
    savedJobs,
    getSavedJobs
  } = useJobsStore();

  useEffect(() => {
    if (jobId) {
      getJobById(jobId);
      getMatchAnalysis(jobId);
      getSavedJobs();
    }
  }, [jobId, getJobById, getMatchAnalysis, getSavedJobs]);

  const isJobSaved = savedJobs.some(job => job.id === jobId);

  const handleSaveToggle = async () => {
    try {
      if (isJobSaved) {
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (isLoading || !currentJob) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
      </div>

      {/* Main Job Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{currentJob.title}</h2>
            <p className="text-xl text-gray-700 mt-2">{currentJob.company}</p>
            
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {currentJob.location}
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {currentJob.jobType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {currentJob.remoteType.charAt(0).toUpperCase() + currentJob.remoteType.slice(1)}
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatSalary(currentJob.salaryMin, currentJob.salaryMax)}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Posted on {formatDate(currentJob.postedDate)}
              {currentJob.applicationDeadline && (
                <span> • Deadline: {formatDate(currentJob.applicationDeadline)}</span>
              )}
            </div>
          </div>

          {currentJob.matchScore !== undefined && (
            <div className="ml-6 text-center">
              <div className={`text-4xl font-bold ${currentJob.matchScore >= 80 ? 'text-green-600' : currentJob.matchScore >= 60 ? 'text-blue-600' : currentJob.matchScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {currentJob.matchScore}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Match Score</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href={currentJob.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-medium"
          >
            Apply Now
          </a>
          <button
            onClick={handleSaveToggle}
            className={`px-6 py-3 rounded-lg border font-medium ${
              isJobSaved
                ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isJobSaved ? 'Saved' : 'Save Job'}
          </button>
          <button
            onClick={() => router.push(`/applications/new?jobId=${jobId}`)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Track Application
          </button>
        </div>
      </div>

      {/* Match Analysis */}
      {matchAnalysis && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Match Analysis</h3>
          
          <div className="grid grid-cols-5 gap-4 mb-6">
            {Object.entries(matchAnalysis.breakdown).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(value)} rounded-lg py-2`}>
                  {value}%
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {key.replace(/([A-Z])/g, ' $1').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Matching Skills */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Matching Skills ({matchAnalysis.matchingSkills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchAnalysis.matchingSkills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Missing Skills ({matchAnalysis.missingSkills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchAnalysis.missingSkills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {matchAnalysis.recommendations.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
              <ul className="space-y-2">
                {matchAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start">
                    <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Job Description</h3>
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
          {currentJob.description}
        </div>
      </div>

      {/* Requirements */}
      {currentJob.requirements && currentJob.requirements.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Requirements</h3>
          <ul className="space-y-2">
            {currentJob.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start text-gray-700">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Responsibilities */}
      {currentJob.responsibilities && currentJob.responsibilities.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Responsibilities</h3>
          <ul className="space-y-2">
            {currentJob.responsibilities.map((resp, idx) => (
              <li key={idx} className="flex items-start text-gray-700">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {resp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Benefits */}
      {currentJob.benefits && currentJob.benefits.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Benefits</h3>
          <ul className="space-y-2">
            {currentJob.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start text-gray-700">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Source Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Source: {currentJob.source.charAt(0).toUpperCase() + currentJob.source.slice(1)}</span>
          <span>Job ID: {currentJob.externalId}</span>
        </div>
      </div>
    </div>
  );
}
