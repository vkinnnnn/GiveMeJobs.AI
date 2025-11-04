import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateAndSanitize, sanitizeInput } from '../middleware/validation.middleware';
import { 
  updateProfileSchema, 
  createSkillSchema, 
  updateSkillSchema,
  createExperienceSchema,
  updateExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  createCareerGoalSchema,
  updateCareerGoalSchema
} from '../validators/profile.validators';

/**
 * Profile Routes
 */
const router = Router();
const profileController = new ProfileController();

// Apply sanitization to all routes
router.use(sanitizeInput);

/**
 * @route   GET /api/users/:id/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/:id/profile', authenticate, profileController.getProfile);

/**
 * @route   PUT /api/users/:id/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/:id/profile', authenticate, validateAndSanitize(updateProfileSchema), profileController.updateProfile);

/**
 * Skills Routes
 */

/**
 * @route   POST /api/users/:id/skills
 * @desc    Create a new skill
 * @access  Private
 */
router.post('/:id/skills', authenticate, validateAndSanitize(createSkillSchema), profileController.createSkill);

/**
 * @route   GET /api/users/:id/skills
 * @desc    Get all skills for a user
 * @access  Private
 */
router.get('/:id/skills', authenticate, profileController.getSkills);

/**
 * @route   PUT /api/users/:id/skills/:skillId
 * @desc    Update a skill
 * @access  Private
 */
router.put('/:id/skills/:skillId', authenticate, validateAndSanitize(updateSkillSchema), profileController.updateSkill);

/**
 * @route   DELETE /api/users/:id/skills/:skillId
 * @desc    Delete a skill
 * @access  Private
 */
router.delete('/:id/skills/:skillId', authenticate, profileController.deleteSkill);

/**
 * Experience Routes
 */

/**
 * @route   POST /api/users/:id/experience
 * @desc    Create a new experience
 * @access  Private
 */
router.post('/:id/experience', authenticate, validateAndSanitize(createExperienceSchema), profileController.createExperience);

/**
 * @route   GET /api/users/:id/experience
 * @desc    Get all experience for a user
 * @access  Private
 */
router.get('/:id/experience', authenticate, profileController.getExperience);

/**
 * @route   PUT /api/users/:id/experience/:expId
 * @desc    Update an experience
 * @access  Private
 */
router.put('/:id/experience/:expId', authenticate, validateAndSanitize(updateExperienceSchema), profileController.updateExperience);

/**
 * @route   DELETE /api/users/:id/experience/:expId
 * @desc    Delete an experience
 * @access  Private
 */
router.delete('/:id/experience/:expId', authenticate, profileController.deleteExperience);

/**
 * Education Routes
 */

/**
 * @route   POST /api/users/:id/education
 * @desc    Create a new education
 * @access  Private
 */
router.post('/:id/education', authenticate, validateAndSanitize(createEducationSchema), profileController.createEducation);

/**
 * @route   GET /api/users/:id/education
 * @desc    Get all education for a user
 * @access  Private
 */
router.get('/:id/education', authenticate, profileController.getEducation);

/**
 * @route   PUT /api/users/:id/education/:eduId
 * @desc    Update an education
 * @access  Private
 */
router.put('/:id/education/:eduId', authenticate, validateAndSanitize(updateEducationSchema), profileController.updateEducation);

/**
 * @route   DELETE /api/users/:id/education/:eduId
 * @desc    Delete an education
 * @access  Private
 */
router.delete('/:id/education/:eduId', authenticate, profileController.deleteEducation);

/**
 * Career Goals Routes
 */

/**
 * @route   POST /api/users/:id/career-goals
 * @desc    Create a new career goal
 * @access  Private
 */
router.post('/:id/career-goals', authenticate, validateAndSanitize(createCareerGoalSchema), profileController.createCareerGoal);

/**
 * @route   GET /api/users/:id/career-goals
 * @desc    Get all career goals for a user
 * @access  Private
 */
router.get('/:id/career-goals', authenticate, profileController.getCareerGoals);

/**
 * @route   PUT /api/users/:id/career-goals/:goalId
 * @desc    Update a career goal
 * @access  Private
 */
router.put('/:id/career-goals/:goalId', authenticate, validateAndSanitize(updateCareerGoalSchema), profileController.updateCareerGoal);

/**
 * @route   DELETE /api/users/:id/career-goals/:goalId
 * @desc    Delete a career goal
 * @access  Private
 */
router.delete('/:id/career-goals/:goalId', authenticate, profileController.deleteCareerGoal);

export default router;
