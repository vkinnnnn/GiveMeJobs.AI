'use client';

import { useState } from 'react';
import type { UserPreferences } from '@repo/shared-types';

interface PreferencesSectionProps {
  preferences: UserPreferences;
  onUpdate: (preferences: UserPreferences) => Promise<void>;
}

export function PreferencesSection({ preferences, onUpdate }: PreferencesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserPreferences>(preferences);
  const [locationInput, setLocationInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [companySizeInput, setCompanySizeInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleCancel = () => {
    setFormData(preferences);
    setIsEditing(false);
  };

  const toggleJobType = (type: 'full-time' | 'part-time' | 'contract' | 'internship') => {
    const current = formData.jobTypes || [];
    if (current.includes(type)) {
      setFormData({ ...formData, jobTypes: current.filter((t) => t !== type) });
    } else {
      setFormData({ ...formData, jobTypes: [...current, type] });
    }
  };

  const addLocation = () => {
    if (locationInput.trim()) {
      setFormData({
        ...formData,
        locations: [...(formData.locations || []), locationInput.trim()],
      });
      setLocationInput('');
    }
  };

  const removeLocation = (index: number) => {
    setFormData({
      ...formData,
      locations: (formData.locations || []).filter((_, i) => i !== index),
    });
  };

  const addIndustry = () => {
    if (industryInput.trim()) {
      setFormData({
        ...formData,
        industries: [...(formData.industries || []), industryInput.trim()],
      });
      setIndustryInput('');
    }
  };

  const removeIndustry = (index: number) => {
    setFormData({
      ...formData,
      industries: (formData.industries || []).filter((_, i) => i !== index),
    });
  };

  const addCompanySize = () => {
    if (companySizeInput.trim()) {
      setFormData({
        ...formData,
        companySizes: [...(formData.companySizes || []), companySizeInput.trim()],
      });
      setCompanySizeInput('');
    }
  };

  const removeCompanySize = (index: number) => {
    setFormData({
      ...formData,
      companySizes: (formData.companySizes || []).filter((_, i) => i !== index),
    });
  };

  if (!isEditing) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Job Preferences</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Preferences
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Types</label>
            <div className="flex flex-wrap gap-2">
              {preferences.jobTypes?.map((type) => (
                <span key={type} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remote Preference</label>
            <p className="text-gray-900 capitalize">{preferences.remotePreference}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Locations</label>
            <div className="flex flex-wrap gap-2">
              {preferences.locations?.map((location, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {location}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary</label>
              <p className="text-gray-900">${preferences.salaryMin?.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Salary</label>
              <p className="text-gray-900">${preferences.salaryMax?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Industries</label>
            <div className="flex flex-wrap gap-2">
              {preferences.industries?.map((industry, idx) => (
                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {industry}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Sizes</label>
            <div className="flex flex-wrap gap-2">
              {preferences.companySizes?.map((size, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {size}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Job Preferences</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Types</label>
          <div className="flex flex-wrap gap-2">
            {(['full-time', 'part-time', 'contract', 'internship'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleJobType(type)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  formData.jobTypes?.includes(type)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Remote Preference</label>
          <select
            value={formData.remotePreference}
            onChange={(e) =>
              setFormData({
                ...formData,
                remotePreference: e.target.value as 'remote' | 'hybrid' | 'onsite' | 'any',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
            <option value="any">Any</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Locations</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Add a location"
            />
            <button
              type="button"
              onClick={addLocation}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.locations?.map((location, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm flex items-center gap-2"
              >
                {location}
                <button
                  type="button"
                  onClick={() => removeLocation(index)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary</label>
            <input
              type="number"
              value={formData.salaryMin}
              onChange={(e) => setFormData({ ...formData, salaryMin: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 80000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Salary</label>
            <input
              type="number"
              value={formData.salaryMax}
              onChange={(e) => setFormData({ ...formData, salaryMax: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 150000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Industries</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={industryInput}
              onChange={(e) => setIndustryInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustry())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Add an industry"
            />
            <button
              type="button"
              onClick={addIndustry}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.industries?.map((industry, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
              >
                {industry}
                <button
                  type="button"
                  onClick={() => removeIndustry(index)}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Sizes</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={companySizeInput}
              onChange={(e) => setCompanySizeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompanySize())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 1-50, 51-200, 201-500"
            />
            <button
              type="button"
              onClick={addCompanySize}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.companySizes?.map((size, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-2"
              >
                {size}
                <button
                  type="button"
                  onClick={() => removeCompanySize(index)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Preferences
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
