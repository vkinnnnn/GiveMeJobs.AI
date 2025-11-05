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
 * Handles HTTP requests for user profile endpoints with robust error handling
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

      const result = await this.profileService.getProfile(id);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          profile: result.data,
        },
      });
    } catch (error) {
      console.error('Get profile controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.updateProfile(id, data);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile: result.data,
        },
      });
    } catch (error) {
      console.error('Update profile controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.createSkill(id, data);

      if (result.failure) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Skill created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Create skill controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.getSkills(id);

      if (result.failure) {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          skills: result.data,
        },
      });
    } catch (error) {
      console.error('Get skills controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.updateSkill(skillId, id, data);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Skill updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Update skill controller error', { 
        skillId: req.params.skillId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.deleteSkill(skillId, id);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Skill deleted successfully',
      });
    } catch (error) {
      console.error('Delete skill controller error', { 
        skillId: req.params.skillId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.createExperience(id, data);

      if (result.failure) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Experience created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Create experience controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      const result = await this.profileService.getExperience(id);

      if (result.failure) {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          experience: result.data,
        },
      });
    } catch (error) {
      console.error('Get experience controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.updateExperience(expId, id, data);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Experience updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Update experience controller error', { 
        expId: req.params.expId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.deleteExperience(expId, id);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Experience deleted successfully',
      });
    } catch (error) {
      console.error('Delete experience controller error', { 
        expId: req.params.expId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.createEducation(id, data);

      if (result.failure) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Education created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Create education controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.getEducation(id);

      if (result.failure) {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          education: result.data,
        },
      });
    } catch (error) {
      console.error('Get education controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.updateEducation(eduId, id, data);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Education updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Update education controller error', { 
        eduId: req.params.eduId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.deleteEducation(eduId, id);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Education deleted successfully',
      });
    } catch (error) {
      console.error('Delete education controller error', { 
        eduId: req.params.eduId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.createCareerGoal(id, data);

      if (result.failure) {
        res.status(400).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Career goal created successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Create career goal controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.getCareerGoals(id);

      if (result.failure) {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          careerGoals: result.data,
        },
      });
    } catch (error) {
      console.error('Get career goals controller error', { 
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.updateCareerGoal(goalId, id, data);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Career goal updated successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Update career goal controller error', { 
        goalId: req.params.goalId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
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

      if (id !== requestingUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const result = await this.profileService.deleteCareerGoal(goalId, id);

      if (result.failure) {
        const statusCode = result.error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Career goal deleted successfully',
      });
    } catch (error) {
      console.error('Delete career goal controller error', { 
        goalId: req.params.goalId,
        userId: req.params.id, 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}