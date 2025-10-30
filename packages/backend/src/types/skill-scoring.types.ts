/**
 * Skill Scoring Types
 */

export interface SkillScoreBreakdown {
  technicalSkills: number;
  experience: number;
  education: number;
  certifications: number;
  projectPortfolio: number;
  endorsements: number;
}

export interface SkillScore {
  userId: string;
  overallScore: number;
  breakdown: SkillScoreBreakdown;
  lastCalculated: Date;
}

export interface SkillScoreHistory {
  id: string;
  userId: string;
  score: number;
  trigger: 'profile_update' | 'new_skill' | 'certification' | 'experience_added' | 'education_added' | 'manual_recalculation';
  breakdown: SkillScoreBreakdown;
  createdAt: Date;
}

export interface SkillGap {
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  priority: 'high' | 'medium' | 'low';
  estimatedLearningTime: string;
}

export interface LearningResource {
  title: string;
  provider: string;
  type: 'course' | 'certification' | 'book' | 'tutorial';
  url: string;
  duration: string;
  cost: number;
  relevanceScore: number;
}

export interface SkillGapAnalysis {
  userId: string;
  targetRole: string;
  currentSkills: Array<{
    name: string;
    proficiencyLevel: number;
    yearsOfExperience: number;
  }>;
  requiredSkills: Array<{
    name: string;
    requiredLevel: number;
    importance: 'critical' | 'important' | 'nice-to-have';
  }>;
  gaps: SkillGap[];
  recommendations: LearningResource[];
  matchPercentage: number;
}

export interface ScoringWeights {
  technicalSkills: number;
  experience: number;
  education: number;
  certifications: number;
  projectPortfolio: number;
  endorsements: number;
}
