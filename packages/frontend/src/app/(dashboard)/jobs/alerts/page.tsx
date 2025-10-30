'use client';

import { useEffect, useState } from 'react';
import { useJobAlertsStore } from '@/stores/job-alerts.store';

export default function JobAlertsPage() {
  const { alerts, isLoading, getAlerts, createAlert, updateAlert, deleteAlert } = useJobAlertsStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    keywords: '',
    locations: '',
    jobTypes: [] as string[],
    remoteTypes: [] as string[],
    salaryMin: '',
    minMatchScore: '',
    frequency: 'daily' as 'realtime' | 'daily' | 'weekly',
    active: true,
  });

  useEffect(() => {
    getAlerts();
  }, [getAlerts]);

  const resetForm = () => {
    setFormData({
      name: '',
      keywords: '',
      locations: '',
      jobTypes: [],
      remoteTypes: [],
      salaryMin: '',
      minMatchScore: '',
      frequency: 'daily',
      active: true,
    });
    setShowCreateForm(false);
    setEditingAlert(null);
  };

  const handleEdit = (alert: any) => {
    setFormData({
      name: alert.name,
      keywords: alert.criteria.keywords.join(', '),
      locations: alert.criteria.locations.join(', '),
      jobTypes: alert.criteria.jobTypes,
      remoteTypes: alert.criteria.remoteTypes,
      salaryMin: alert.criteria.salaryMin?.toString() || '',
      minMatchScore: alert.criteria.minMatchScore?.toString() || '',
      frequency: alert.frequency,
      active: alert.active,
    });
    setEditingAlert(alert.id);
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const alertData = {
      name: formData.name,
      criteria: {
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        locations: formData.locations.split(',').map(l => l.trim()).filter(l => l),
        jobTypes: formData.jobTypes,
        remoteTypes: formData.remoteTypes,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        minMatchScore: formData.minMatchScore ? parseInt(formData.minMatchScore) : undefined,
      },
      frequency: formData.frequency,
      active: formData.active,
    };

    try {
      if (editingAlert) {
        await updateAlert(editingAlert, alertData);
      } else {
        await createAlert(alertData);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save alert:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      try {
        await deleteAlert(id);
      } catch (error) {
        console.error('Failed to delete alert:', error);
      }
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateAlert(id, { active: !active });
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const toggleArrayField = (field: 'jobTypes' | 'remoteTypes', value: string) => {
    setFormData(prev => {
      const array = prev[field];
      const newArray = array.includes(value)
        ? array.filter(v => v !== value)
        : [...array, value];
      return { ...prev, [field]: newArray };
    });
  };

  if (isLoading && alerts.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Job Alerts</h1>
          <p className="text-gray-600 mt-1">
            Get notified when new jobs match your criteria
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Alert
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {editingAlert ? 'Edit Alert' : 'Create New Alert'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Senior Frontend Developer in NYC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="e.g., React, TypeScript, Frontend"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Locations (comma-separated)
              </label>
              <input
                type="text"
                value={formData.locations}
                onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                placeholder="e.g., New York, San Francisco, Remote"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleArrayField('jobTypes', type)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.jobTypes.includes(type)
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remote Type
              </label>
              <div className="flex flex-wrap gap-2">
                {['remote', 'hybrid', 'onsite'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleArrayField('remoteTypes', type)}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.remoteTypes.includes(type)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                  placeholder="e.g., 80000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Match Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.minMatchScore}
                  onChange={(e) => setFormData({ ...formData, minMatchScore: e.target.value })}
                  placeholder="e.g., 70"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Frequency
              </label>
              <div className="flex gap-2">
                {(['realtime', 'daily', 'weekly'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: freq })}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.frequency === freq
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                Active (receive notifications)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job alerts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first alert to get notified about relevant jobs.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{alert.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      alert.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    {alert.criteria.keywords.length > 0 && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Keywords:</span>
                        <span>{alert.criteria.keywords.join(', ')}</span>
                      </div>
                    )}
                    {alert.criteria.locations.length > 0 && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Locations:</span>
                        <span>{alert.criteria.locations.join(', ')}</span>
                      </div>
                    )}
                    {alert.criteria.jobTypes.length > 0 && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Job Types:</span>
                        <span>
                          {alert.criteria.jobTypes.map(t => 
                            t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                    {alert.criteria.remoteTypes.length > 0 && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Remote:</span>
                        <span>
                          {alert.criteria.remoteTypes.map(t => 
                            t.charAt(0).toUpperCase() + t.slice(1)
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                    {alert.criteria.salaryMin && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Min Salary:</span>
                        <span>${(alert.criteria.salaryMin / 1000).toFixed(0)}k+</span>
                      </div>
                    )}
                    {alert.criteria.minMatchScore && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Min Match:</span>
                        <span>{alert.criteria.minMatchScore}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => toggleActive(alert.id, alert.active)}
                    className={`p-2 rounded-lg border ${
                      alert.active
                        ? 'border-gray-300 hover:bg-gray-50'
                        : 'border-green-300 hover:bg-green-50'
                    }`}
                    title={alert.active ? 'Deactivate' : 'Activate'}
                  >
                    {alert.active ? (
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(alert)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
