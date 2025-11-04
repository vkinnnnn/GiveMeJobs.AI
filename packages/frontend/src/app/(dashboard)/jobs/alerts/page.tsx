'use client';

import { useEffect, useState } from 'react';
import { useJobAlertsStore } from '@/stores/job-alerts.store';
import { JobAlert } from '@givemejobs/shared-types';

export default function JobAlertsPage() {
  const { alerts, isLoading, getAlerts, createAlert, updateAlert, deleteAlert } = useJobAlertsStore();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    keywords: [] as string[],
    locations: [] as string[],
    jobTypes: [] as string[],
    remoteTypes: [] as string[],
    salaryMin: undefined as number | undefined,
    minMatchScore: undefined as number | undefined,
    frequency: 'daily' as 'realtime' | 'daily' | 'weekly',
    active: true,
  });

  useEffect(() => {
    getAlerts();
  }, [getAlerts]);

  const resetForm = () => {
    setFormData({
      name: '',
      keywords: [],
      locations: [],
      jobTypes: [],
      remoteTypes: [],
      salaryMin: undefined,
      minMatchScore: undefined,
      frequency: 'daily',
      active: true,
    });
    setShowCreateForm(false);
    setEditingAlert(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const alertData = {
        ...formData,
        criteria: {
          keywords: formData.keywords,
          locations: formData.locations,
          jobTypes: formData.jobTypes,
          remoteTypes: formData.remoteTypes,
          salaryMin: formData.salaryMin,
          minMatchScore: formData.minMatchScore,
        },
      };

      if (editingAlert) {
        await updateAlert(editingAlert.id, alertData);
      } else {
        await createAlert(alertData);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save alert:', error);
      alert('Failed to save alert. Please try again.');
    }
  };

  const handleEdit = (alert: JobAlert) => {
    setEditingAlert(alert);
    setFormData({
      name: alert.name,
      keywords: alert.criteria.keywords || [],
      locations: alert.criteria.locations || [],
      jobTypes: alert.criteria.jobTypes || [],
      remoteTypes: alert.criteria.remoteTypes || [],
      salaryMin: alert.criteria.salaryMin,
      minMatchScore: alert.criteria.minMatchScore,
      frequency: alert.frequency,
      active: alert.active,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (alertId: string) => {
    if (confirm('Are you sure you want to delete this job alert?')) {
      try {
        await deleteAlert(alertId);
      } catch (error) {
        console.error('Failed to delete alert:', error);
        alert('Failed to delete alert. Please try again.');
      }
    }
  };

  const handleToggleActive = async (alert: JobAlert) => {
    try {
      await updateAlert(alert.id, { active: !alert.active });
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  const addToArray = (field: 'keywords' | 'locations' | 'jobTypes' | 'remoteTypes', value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const removeFromArray = (field: 'keywords' | 'locations' | 'jobTypes' | 'remoteTypes', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value)
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
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
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
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
            {/* Alert Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Frontend Developer Jobs"
                required
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add keyword and press Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('keywords', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeFromArray('keywords', keyword)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Locations
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add location and press Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addToArray('locations', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.locations.map((location, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() => removeFromArray('locations', location)}
                      className="ml-2 text-green-500 hover:text-green-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Job Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (formData.jobTypes.includes(type)) {
                        removeFromArray('jobTypes', type);
                      } else {
                        addToArray('jobTypes', type);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm ${
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

            {/* Remote Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remote Preference
              </label>
              <div className="flex flex-wrap gap-2">
                {['remote', 'hybrid', 'onsite'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (formData.remoteTypes.includes(type)) {
                        removeFromArray('remoteTypes', type);
                      } else {
                        addToArray('remoteTypes', type);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm ${
                      formData.remoteTypes.includes(type)
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Salary and Match Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  value={formData.salaryMin || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    salaryMin: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 50000"
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
                  value={formData.minMatchScore || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    minMatchScore: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 70"
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Frequency
              </label>
              <div className="flex gap-2">
                {(['realtime', 'daily', 'weekly'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, frequency: freq }))}
                    className={`px-4 py-2 rounded-lg border text-sm ${
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

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading job alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No job alerts yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first job alert to get notified about relevant opportunities
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white shadow rounded-lg p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{alert.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        alert.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {alert.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {alert.frequency}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {alert.criteria.keywords && alert.criteria.keywords.length > 0 && (
                      <div>
                        <span className="font-medium">Keywords:</span>
                        <span className="ml-2">{alert.criteria.keywords.join(', ')}</span>
                      </div>
                    )}
                    {alert.criteria.locations && alert.criteria.locations.length > 0 && (
                      <div>
                        <span className="font-medium">Locations:</span>
                        <span className="ml-2">{alert.criteria.locations.join(', ')}</span>
                      </div>
                    )}
                    {alert.criteria.jobTypes && alert.criteria.jobTypes.length > 0 && (
                      <div>
                        <span className="font-medium">Job Types:</span>
                        <span className="ml-2">
                          {alert.criteria.jobTypes.map(type => 
                            type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                    {alert.criteria.salaryMin && (
                      <div>
                        <span className="font-medium">Min Salary:</span>
                        <span className="ml-2">${alert.criteria.salaryMin.toLocaleString()}</span>
                      </div>
                    )}
                    {alert.criteria.minMatchScore && (
                      <div>
                        <span className="font-medium">Min Match Score:</span>
                        <span className="ml-2">{alert.criteria.minMatchScore}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(alert)}
                    className={`px-3 py-1 text-sm rounded ${
                      alert.active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {alert.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEdit(alert)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}