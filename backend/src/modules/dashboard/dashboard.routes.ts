import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

router.use(requireRole('Admin', 'Project Manager'));

router.get('/stats', dashboardController.getStats);
router.get('/allocation-heatmap', dashboardController.getAllocationHeatmap);
router.get('/staffing-risks', dashboardController.getStaffingRisks);

export { router as dashboardRouter };
