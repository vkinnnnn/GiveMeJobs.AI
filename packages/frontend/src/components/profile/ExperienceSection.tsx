'use client';

import { useState } from 'react';
import type { Experience } from '@repo/shared-types';

interface ExperienceSectionProps {
  experience: Experience[];
  onAdd: (exp: Omit<Experience, 'id'>) => Promise<void>;
  onUpdate: (expId: string, exp: Partial<Experience>) => Promise<void>;
  onDelete: (expId: string) => Promise<void>;
}

export function ExperienceSection({ experience, onAdd, onUpdate, onDelete }: ExperienceSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Experience, 'id'>>({
    company: '',
    title: '',
    startDate: new Date(),
    current: false,
    description: '',
    achievements: [],
    skills: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await onUpdate(editingId, formData);
        setEditingId(null);
      } else {
        await onAdd(formData);
        setIsAdding(false);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save experience:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      company: '',
      title: '',
      startDate: new Date(),
      current: false,
      description: '',
      achievements: [],
      skills: [],
    });
  };

  const handleEdit = (exp: Experience) => {
    setEditingId(exp.id);
    setFormData(exp);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Experience</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Experience
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={new Date(formData.startDate).toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={formData.current}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.current}
                onChange={(e) =>
                  setFormData({ ...formData, current: e.target.checked, endDate: undefined })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">I currently work here</span>
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              required
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Add'} Experience
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
      )}

      <div className="space-y-4">
        {experience.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No experience added yet</p>
        ) : (
          experience.map((exp) => (
            <div
              key={exp.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                  <p className="text-gray-700">{exp.company}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(exp.startDate)} - {exp.current ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'N/A'}
                  </p>
                  <p className="text-gray-600 mt-2">{exp.description}</p>
                  {exp.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exp.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(exp)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(exp.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
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
