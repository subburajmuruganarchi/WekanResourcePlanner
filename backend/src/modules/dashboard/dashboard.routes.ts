import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import { MANAGEMENT_VIEW_ROLES } from '../../common/constants/roles';

const router = Router();

router.use(requireRole(...MANAGEMENT_VIEW_ROLES));

router.get('/stats', dashboardController.getStats);
router.get('/allocation-heatmap', dashboardController.getAllocationHeatmap);
router.get('/staffing-risks', dashboardController.getStaffingRisks);

export { router as dashboardRouter };
