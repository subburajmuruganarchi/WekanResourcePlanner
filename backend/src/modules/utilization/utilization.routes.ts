import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { requireFeature } from '../../common/middleware/feature-flag.middleware';
import { utilizationController } from './utilization.controller';

const router = Router();

router.use(requireFeature('utilizationApiEnabled'));
router.use(requireRole());

router.get(
    '/variance',
    requireRole('Admin', 'Project Manager'),
    (req, res, next) => utilizationController.getVariance(req, res, next)
);

router.get(
    '/employee/:id',
    requireRole('Admin', 'Project Manager'),
    (req, res, next) => utilizationController.getEmployeeUtilization(req, res, next)
);

router.get(
    '/project/:id',
    requireRole('Admin', 'Project Manager'),
    (req, res, next) => utilizationController.getProjectUtilization(req, res, next)
);

router.get(
    '/dashboard-summary',
    requireRole('Admin', 'Project Manager'),
    (req, res, next) => utilizationController.getDashboardSummary(req, res, next)
);

router.post(
    '/sync',
    requireRole('Admin'),
    (req, res, next) => utilizationController.syncActuals(req, res, next)
);

export { router as utilizationRouter };
