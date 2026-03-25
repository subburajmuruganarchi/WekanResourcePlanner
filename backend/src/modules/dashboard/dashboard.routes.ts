import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

router.use(requireRole('Admin', 'Project Manager'));

router.get('/stats', dashboardController.getStats);

export { router as dashboardRouter };
