import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const controller = new ReportsController();

router.use(requireRole('Admin', 'Project Manager'));

router.get('/consolidated', controller.getConsolidatedReport);
router.get('/role-summary', controller.getRoleSummaryReport);
router.get('/bandwidth', controller.getBandwidthReport);

export default router;
