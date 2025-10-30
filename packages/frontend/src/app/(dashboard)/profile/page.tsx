'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { ExperienceSection } from '@/components/profile/ExperienceSection';
import { EducationSection } from '@/components/profile/EducationSection';
import { CareerGoalsSection } from '@/components/profile/CareerGoalsSection';
import { PreferencesSection } from '@/components/profile/PreferencesSection';
import { SkillScoreWidget } from '@/components/profile/SkillScoreWidget';
import { SkillProgressChart } from '@/components/profile/SkillProgressChart';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const {
    profile,
    skillScore,
    isLoading,
    fetchProfile,
    fetchSkillScore,
    addSkill,
    updateSkill,
    deleteSkill,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    addCareerGoal,
    updateCareerGoal,
    deleteCareerGoal,
    updatePreferences,
  } = useProfileStore();

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchSkillScore(user.id);
    }
  }, [user?.id, fetchProfile, fetchSkillScore]);

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{user?.email}</p>
              </div>
              {user?.professionalHeadline && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Professional Headline</label>
                  <p className="mt-1 text-gray-900">{user.professionalHeadline}</p>
                </div>
              )}
            </div>
          </div>

          <SkillsSection
            skills={profile.skills || []}
            onAdd={(skill) => addSkill(user!.id, skill)}
            onUpdate={(skillId, skill) => updateSkill(user!.id, skillId, skill)}
            onDelete={(skillId) => deleteSkill(user!.id, skillId)}
          />

          <ExperienceSection
            experience={profile.experience || []}
            onAdd={(exp) => addExperience(user!.id, exp)}
            onUpdate={(expId, exp) => updateExperience(user!.id, expId, exp)}
            onDelete={(expId) => deleteExperience(user!.id, expId)}
          />

          <EducationSection
            education={profile.education || []}
            onAdd={(edu) => addEducation(user!.id, edu)}
            onUpdate={(eduId, edu) => updateEducation(user!.id, eduId, edu)}
            onDelete={(eduId) => deleteEducation(user!.id, eduId)}
          />

          <CareerGoalsSection
            careerGoals={profile.careerGoals || []}
            onAdd={(goal) => addCareerGoal(user!.id, goal)}
            onUpdate={(goalId, goal) => updateCareerGoal(user!.id, goalId, goal)}
            onDelete={(goalId) => deleteCareerGoal(user!.id, goalId)}
          />

          <PreferencesSection
            preferences={profile.preferences || {
              jobTypes: [],
              remotePreference: 'any',
              locations: [],
              salaryMin: 0,
              salaryMax: 0,
              industries: [],
              companySizes: [],
            }}
            onUpdate={(preferences) => updatePreferences(user!.id, preferences)}
          />
        </div>

        <div className="space-y-6">
          {skillScore && <SkillScoreWidget skillScore={skillScore} />}
          {skillScore?.history && <SkillProgressChart history={skillScore.history} />}
        </div>
      </div>
    </div>
  );
}
