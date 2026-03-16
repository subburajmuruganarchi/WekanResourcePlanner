
import { Router } from 'express';
import { ReportsController } from './reports.controller';

const router = Router();
const controller = new ReportsController();

router.get('/consolidated', controller.getConsolidatedReport);
router.get('/role-summary', controller.getRoleSummaryReport);
router.get('/bandwidth', controller.getBandwidthReport);

export default router;
