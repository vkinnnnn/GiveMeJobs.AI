import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loadUserRole, requirePermission, Permission } from '../middleware/rbac.middleware';

const router = Router();

// All analytics routes require authentication and role loading
router.use(authenticate);
router.use(loadUserRole);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get analytics dashboard with metrics, trends, and insights
 * @access  Private
 * @query   period - week, month, quarter, or year (default: month)
 */
router.get('/dashboard', requirePermission(Permission.READ_OWN_ANALYTICS), (req, res) => analyticsController.getDashboard(req, res));

/**
 * @route   GET /api/analytics/benchmarks
 * @desc    Get benchmark comparison with platform averages
 * @access  Private
 */
router.get('/benchmarks', (req, res) => analyticsController.getBenchmarks(req, res));

/**
 * @route   GET /api/analytics/applications
 * @desc    Get detailed application analytics (best days, responsive companies, etc.)
 * @access  Private
 */
router.get('/applications', (req, res) => analyticsController.getApplicationAnalytics(req, res));

/**
 * @route   POST /api/analytics/export
 * @desc    Export analytics data to CSV or PDF
 * @access  Private
 * @body    { format: 'csv' | 'pdf', period: 'week' | 'month' | 'quarter' | 'year', includeCharts?: boolean }
 */
router.post('/export', (req, res) => analyticsController.exportAnalytics(req, res));

export default router;
