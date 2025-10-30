'use client';

import { useEffect, useState, useMemo } from 'react';
import { useApplicationsStore } from '@/stores/applications.store';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { ApplicationFilters } from '@/components/applications/ApplicationFilters';
import { ApplicationStats } from '@/components/applications/ApplicationStats';
import { ApplicationTrends } from '@/components/applications/ApplicationTrends';

export default function ApplicationsPage() {
  const { applications, stats, isLoading, getApplications, getStats } = useApplicationsStore();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    getApplications();
    getStats();
  }, [getApplications, getStats]);

  const filteredAndSortedApplications = useMemo(() => {
    let filtered = [...applications];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((app) => app.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((app) =>
        app.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
        case 'date-asc':
          return new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
        case 'updated-desc':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [applications, selectedStatus, sortBy, searchQuery]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Tracker</h1>
            <p className="text-gray-600">
              Track and manage all your job applications in one place
            </p>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            {showStats ? 'Hide' : 'Show'} Statistics
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {showStats && stats && (
        <div className="mb-6 space-y-6">
          <ApplicationStats stats={stats} />
          <ApplicationTrends applications={applications} />
        </div>
      )}

      <ApplicationFilters
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAndSortedApplications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || selectedStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Start applying to jobs to track your applications here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredAndSortedApplications.length} of {applications.length} applications
          </div>
          {filteredAndSortedApplications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
