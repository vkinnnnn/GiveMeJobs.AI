'use client';

import { useState } from 'react';
import type { Education } from '@givemejobs/shared-types';

interface EducationSectionProps {
  education: Education[];
  onAdd: (edu: Omit<Education, 'id'>) => Promise<void>;
  onUpdate: (eduId: string, edu: Partial<Education>) => Promise<void>;
  onDelete: (eduId: string) => Promise<void>;
}

export function EducationSection({ education, onAdd, onUpdate, onDelete }: EducationSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Education, 'id'>>({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: new Date(),
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
      console.error('Failed to save education:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: new Date(),
    });
  };

  const handleEdit = (edu: Education) => {
    setEditingId(edu.id);
    setFormData(edu);
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
        <h2 className="text-xl font-semibold text-gray-900">Education</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Education
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
              <input
                type="text"
                value={formData.fieldOfStudy}
                onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPA (Optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={formData.gpa || ''}
                onChange={(e) =>
                  setFormData({ ...formData, gpa: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
              <input
                type="date"
                value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Add'} Education
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
        {education.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No education added yet</p>
        ) : (
          education.map((edu) => (
            <div
              key={edu.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                  <p className="text-gray-700">{edu.institution}</p>
                  <p className="text-gray-600">{edu.fieldOfStudy}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(edu.startDate)} - {edu.endDate ? formatDate(edu.endDate) : 'Present'}
                  </p>
                  {edu.gpa && (
                    <p className="text-sm text-gray-600 mt-1">GPA: {edu.gpa.toFixed(2)}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(edu)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(edu.id)}
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
