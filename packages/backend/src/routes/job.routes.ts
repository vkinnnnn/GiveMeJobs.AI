import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { jobMatchingController } from '../controllers/job-matching.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All job routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/jobs/search
 * @desc    Search for jobs across multiple job boards
 * @access  Private
 * @query   keywords, location, remoteType, jobType, salaryMin, salaryMax, postedWithin, page, limit
 */
router.get('/search', (req, res) => jobController.searchJobs(req, res));

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job details by ID
 * @access  Private
 */
router.get('/:id', (req, res) => jobController.getJobById(req, res));

/**
 * @route   GET /api/jobs/:source/:externalId
 * @desc    Get job details by source and external ID
 * @access  Private
 */
router.get('/:source/:externalId', (req, res) => jobController.getJobDetails(req, res));

/**
 * @route   POST /api/jobs/:jobId/save
 * @desc    Save a job to user's saved jobs list
 * @access  Private
 */
router.post('/:jobId/save', (req, res) => jobController.saveJob(req, res));

/**
 * @route   DELETE /api/jobs/:jobId/unsave
 * @desc    Remove a job from user's saved jobs list
 * @access  Private
 */
router.delete('/:jobId/unsave', (req, res) => jobController.unsaveJob(req, res));

/**
 * @route   GET /api/jobs/saved
 * @desc    Get all saved jobs for the authenticated user
 * @access  Private
 */
router.get('/saved', (req, res) => jobController.getSavedJobs(req, res));

/**
 * @route   GET /api/jobs/recommendations
 * @desc    Get personalized job recommendations
 * @access  Private
 * @query   limit, location, remoteType, jobType, salaryMin, minMatchScore
 */
router.get('/recommendations', (req, res) => jobMatchingController.getRecommendations(req, res));

/**
 * @route   GET /api/jobs/:jobId/match-analysis
 * @desc    Get detailed match analysis for a specific job
 * @access  Private
 */
router.get('/:jobId/match-analysis', (req, res) => jobMatchingController.getMatchAnalysis(req, res));

/**
 * @route   POST /api/jobs/batch-match
 * @desc    Calculate match scores for multiple jobs
 * @access  Private
 * @body    { jobIds: string[] }
 */
router.post('/batch-match', (req, res) => jobMatchingController.batchMatchAnalysis(req, res));

export default router;
