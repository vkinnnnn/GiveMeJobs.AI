'use client';

import { useState } from 'react';
import type { Skill } from '@givemejobs/shared-types';

interface SkillsSectionProps {
  skills: Skill[];
  onAdd: (skill: Omit<Skill, 'id'>) => Promise<void>;
  onUpdate: (skillId: string, skill: Partial<Skill>) => Promise<void>;
  onDelete: (skillId: string) => Promise<void>;
}

export function SkillsSection({ skills, onAdd, onUpdate, onDelete }: SkillsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Skill, 'id'>>({
    name: '',
    category: '',
    proficiencyLevel: 3,
    yearsOfExperience: 0,
    endorsements: 0,
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
      setFormData({
        name: '',
        category: '',
        proficiencyLevel: 3,
        yearsOfExperience: 0,
        endorsements: 0,
      });
    } catch (error) {
      console.error('Failed to save skill:', error);
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setFormData(skill);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      category: '',
      proficiencyLevel: 3,
      yearsOfExperience: 0,
      endorsements: 0,
    });
  };

  const getProficiencyLabel = (level: number) => {
    const labels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'];
    return labels[level];
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Skill
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proficiency Level
              </label>
              <select
                value={formData.proficiencyLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    proficiencyLevel: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={1}>Beginner</option>
                <option value={2}>Intermediate</option>
                <option value={3}>Advanced</option>
                <option value={4}>Expert</option>
                <option value={5}>Master</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.yearsOfExperience}
                onChange={(e) =>
                  setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Add'} Skill
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

      <div className="space-y-3">
        {skills.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No skills added yet</p>
        ) : (
          skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900">{skill.name}</h3>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {skill.category}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                  <span>{getProficiencyLabel(skill.proficiencyLevel)}</span>
                  <span>•</span>
                  <span>{skill.yearsOfExperience} years</span>
                  {skill.endorsements > 0 && (
                    <>
                      <span>•</span>
                      <span>{skill.endorsements} endorsements</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(skill)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(skill.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
