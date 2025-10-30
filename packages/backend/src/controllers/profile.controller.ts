import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service';
import { 
  UpdateProfileInput, 
  CreateSkillInput, 
  UpdateSkillInput, 
  CreateExperienceInput, 
  UpdateExperienceInput,
  CreateEducationInput,
  UpdateEducationInput,
  CreateCareerGoalInput,
  UpdateCareerGoalInput
} from '../validators/profile.validators';

/**
 * Profile Controller
 * Handles HTTP requests for user profile endpoints
 */
export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  /**
   * Get user profile
   * GET /api/users/:id/profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only view their own profile
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const profile = await this.profileService.getProfile(id);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          profile,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  };

  /**
   * Update user profile
   * PUT /api/users/:id/profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: UpdateProfileInput = req.body;

      // Users can only update their own profile
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const profile = await this.profileService.updateProfile(id, data);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  };

  /**
   * Create a new skill
   * POST /api/users/:id/skills
   */
  createSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: CreateSkillInput = req.body;

      // Users can only add skills to their own profile
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const skill = await this.profileService.createSkill(id, data);

      res.status(201).json({
        success: true,
        message: 'Skill created successfully',
        data: {
          skill,
        },
      });
    } catch (error) {
      console.error('Create skill error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create skill',
      });
    }
  };

  /**
   * Get all skills for a user
   * GET /api/users/:id/skills
   */
  getSkills = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only view their own skills
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const skills = await this.profileService.getSkills(id);

      res.status(200).json({
        success: true,
        data: {
          skills,
        },
      });
    } catch (error) {
      console.error('Get skills error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get skills',
      });
    }
  };

  /**
   * Update a skill
   * PUT /api/users/:id/skills/:skillId
   */
  updateSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, skillId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: UpdateSkillInput = req.body;

      // Users can only update their own skills
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const skill = await this.profileService.updateSkill(skillId, id, data);

      if (!skill) {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Skill updated successfully',
        data: {
          skill,
        },
      });
    } catch (error) {
      console.error('Update skill error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update skill',
      });
    }
  };

  /**
   * Delete a skill
   * DELETE /api/users/:id/skills/:skillId
   */
  deleteSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, skillId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only delete their own skills
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const skill = await this.profileService.deleteSkill(skillId, id);

      if (!skill) {
        res.status(404).json({
          success: false,
          error: 'Skill not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Skill deleted successfully',
      });
    } catch (error) {
      console.error('Delete skill error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete skill',
      });
    }
  };

  /**
   * Create a new experience
   * POST /api/users/:id/experience
   */
  createExperience = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: CreateExperienceInput = req.body;

      // Users can only add experience to their own profile
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const experience = await this.profileService.createExperience(id, data);

      res.status(201).json({
        success: true,
        message: 'Experience created successfully',
        data: {
          experience,
        },
      });
    } catch (error) {
      console.error('Create experience error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create experience',
      });
    }
  };

  /**
   * Get all experience for a user
   * GET /api/users/:id/experience
   */
  getExperience = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only view their own experience
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const experience = await this.profileService.getExperience(id);

      res.status(200).json({
        success: true,
        data: {
          experience,
        },
      });
    } catch (error) {
      console.error('Get experience error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get experience',
      });
    }
  };

  /**
   * Update an experience
   * PUT /api/users/:id/experience/:expId
   */
  updateExperience = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, expId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: UpdateExperienceInput = req.body;

      // Users can only update their own experience
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const experience = await this.profileService.updateExperience(expId, id, data);

      if (!experience) {
        res.status(404).json({
          success: false,
          error: 'Experience not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Experience updated successfully',
        data: {
          experience,
        },
      });
    } catch (error) {
      console.error('Update experience error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update experience',
      });
    }
  };

  /**
   * Delete an experience
   * DELETE /api/users/:id/experience/:expId
   */
  deleteExperience = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, expId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only delete their own experience
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const experience = await this.profileService.deleteExperience(expId, id);

      if (!experience) {
        res.status(404).json({
          success: false,
          error: 'Experience not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Experience deleted successfully',
      });
    } catch (error) {
      console.error('Delete experience error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete experience',
      });
    }
  };

  /**
   * Create a new education
   * POST /api/users/:id/education
   */
  createEducation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: CreateEducationInput = req.body;

      // Users can only add education to their own profile
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const education = await this.profileService.createEducation(id, data);

      res.status(201).json({
        success: true,
        message: 'Education created successfully',
        data: {
          education,
        },
      });
    } catch (error) {
      console.error('Create education error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create education',
      });
    }
  };

  /**
   * Get all education for a user
   * GET /api/users/:id/education
   */
  getEducation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only view their own education
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const education = await this.profileService.getEducation(id);

      res.status(200).json({
        success: true,
        data: {
          education,
        },
      });
    } catch (error) {
      console.error('Get education error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get education',
      });
    }
  };

  /**
   * Update an education
   * PUT /api/users/:id/education/:eduId
   */
  updateEducation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, eduId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: UpdateEducationInput = req.body;

      // Users can only update their own education
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const education = await this.profileService.updateEducation(eduId, id, data);

      if (!education) {
        res.status(404).json({
          success: false,
          error: 'Education not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Education updated successfully',
        data: {
          education,
        },
      });
    } catch (error) {
      console.error('Update education error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update education',
      });
    }
  };

  /**
   * Delete an education
   * DELETE /api/users/:id/education/:eduId
   */
  deleteEducation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, eduId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only delete their own education
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const education = await this.profileService.deleteEducation(eduId, id);

      if (!education) {
        res.status(404).json({
          success: false,
          error: 'Education not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Education deleted successfully',
      });
    } catch (error) {
      console.error('Delete education error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete education',
      });
    }
  };

  /**
   * Create a new career goal
   * POST /api/users/:id/career-goals
   */
  createCareerGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: CreateCareerGoalInput = req.body;

      // Users can only add career goals to their own profile
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const careerGoal = await this.profileService.createCareerGoal(id, data);

      res.status(201).json({
        success: true,
        message: 'Career goal created successfully',
        data: {
          careerGoal,
        },
      });
    } catch (error) {
      console.error('Create career goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create career goal',
      });
    }
  };

  /**
   * Get all career goals for a user
   * GET /api/users/:id/career-goals
   */
  getCareerGoals = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only view their own career goals
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const careerGoals = await this.profileService.getCareerGoals(id);

      res.status(200).json({
        success: true,
        data: {
          careerGoals,
        },
      });
    } catch (error) {
      console.error('Get career goals error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get career goals',
      });
    }
  };

  /**
   * Update a career goal
   * PUT /api/users/:id/career-goals/:goalId
   */
  updateCareerGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, goalId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;
      const data: UpdateCareerGoalInput = req.body;

      // Users can only update their own career goals
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const careerGoal = await this.profileService.updateCareerGoal(goalId, id, data);

      if (!careerGoal) {
        res.status(404).json({
          success: false,
          error: 'Career goal not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Career goal updated successfully',
        data: {
          careerGoal,
        },
      });
    } catch (error) {
      console.error('Update career goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update career goal',
      });
    }
  };

  /**
   * Delete a career goal
   * DELETE /api/users/:id/career-goals/:goalId
   */
  deleteCareerGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, goalId } = req.params;
      const requestingUserId = req.jwtPayload?.userId;

      // Users can only delete their own career goals
      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const careerGoal = await this.profileService.deleteCareerGoal(goalId, id);

      if (!careerGoal) {
        res.status(404).json({
          success: false,
          error: 'Career goal not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Career goal deleted successfully',
      });
    } catch (error) {
      console.error('Delete career goal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete career goal',
      });
    }
  };
}
