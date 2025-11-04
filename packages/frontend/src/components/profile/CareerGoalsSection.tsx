'use client';

import { useState } from 'react';
import type { CareerGoal } from '@givemejobs/shared-types';

interface CareerGoalsSectionProps {
  careerGoals: CareerGoal[];
  onAdd: (goal: Omit<CareerGoal, 'id'>) => Promise<void>;
  onUpdate: (goalId: string, goal: Partial<CareerGoal>) => Promise<void>;
  onDelete: (goalId: string) => Promise<void>;
}

export function CareerGoalsSection({ careerGoals, onAdd, onUpdate, onDelete }: CareerGoalsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<CareerGoal, 'id'>>({
    targetRole: '',
    targetCompanies: [],
    targetSalary: 0,
    timeframe: '',
    requiredSkills: [],
    skillGaps: [],
  });
  const [companyInput, setCompanyInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

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
      console.error('Failed to save career goal:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      targetRole: '',
      targetCompanies: [],
      targetSalary: 0,
      timeframe: '',
      requiredSkills: [],
      skillGaps: [],
    });
    setCompanyInput('');
    setSkillInput('');
  };

  const handleEdit = (goal: CareerGoal) => {
    setEditingId(goal.id);
    setFormData(goal);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const addCompany = () => {
    if (companyInput.trim()) {
      setFormData({
        ...formData,
        targetCompanies: [...formData.targetCompanies, companyInput.trim()],
      });
      setCompanyInput('');
    }
  };

  const removeCompany = (index: number) => {
    setFormData({
      ...formData,
      targetCompanies: formData.targetCompanies.filter((_, i) => i !== index),
    });
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Career Goals</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Career Goal
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
              <input
                type="text"
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Companies</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompany())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add a company"
                />
                <button
                  type="button"
                  onClick={addCompany}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetCompanies.map((company, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {company}
                    <button
                      type="button"
                      onClick={() => removeCompany(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Salary</label>
                <input
                  type="number"
                  value={formData.targetSalary}
                  onChange={(e) => setFormData({ ...formData, targetSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 120000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <input
                  type="text"
                  value={formData.timeframe}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 6 months"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add a required skill"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Add'} Goal
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
        {careerGoals.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No career goals set yet</p>
        ) : (
          careerGoals.map((goal) => (
            <div key={goal.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{goal.targetRole}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Target: ${goal.targetSalary.toLocaleString()} • Timeframe: {goal.timeframe}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(goal)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {goal.targetCompanies.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Target Companies:</p>
                  <div className="flex flex-wrap gap-2">
                    {goal.targetCompanies.map((company, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {goal.requiredSkills.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {goal.requiredSkills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {goal.skillGaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Skill Gaps:</p>
                  <div className="flex flex-wrap gap-2">
                    {goal.skillGaps.map((gap, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
