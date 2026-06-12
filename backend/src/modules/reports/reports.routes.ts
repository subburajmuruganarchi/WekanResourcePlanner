import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();
const controller = new ReportsController();

router.use(requireRole('Admin', 'Project Manager'));

router.get('/resource-view', controller.getResourceViewReport.bind(controller));
router.get('/project-view', controller.getProjectViewReport.bind(controller));
router.get('/resource-analytics', controller.getResourceAnalyticsReport.bind(controller));
router.get('/consolidated', controller.getConsolidatedReport.bind(controller));
router.get('/consolidated-history', controller.getConsolidatedReport.bind(controller));
router.get('/role-summary', controller.getRoleSummaryReport.bind(controller));
router.get('/bandwidth', controller.getBandwidthReport.bind(controller));
router.get('/overallocated', controller.getOverallocatedReport.bind(controller));

export default router;
