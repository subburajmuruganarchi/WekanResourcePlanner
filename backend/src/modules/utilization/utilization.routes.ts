import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { requireFeature } from '../../common/middleware/feature-flag.middleware';
import { MANAGEMENT_VIEW_ROLES, ROLES } from '../../common/constants/roles';
import { utilizationController } from './utilization.controller';

const router = Router();

router.use(requireFeature('utilizationApiEnabled'));
router.use(requireRole());

router.get(
    '/variance',
    requireRole(...MANAGEMENT_VIEW_ROLES),
    (req, res, next) => utilizationController.getVariance(req, res, next)
);

router.get(
    '/employee/:id',
    requireRole(...MANAGEMENT_VIEW_ROLES),
    (req, res, next) => utilizationController.getEmployeeUtilization(req, res, next)
);

router.get(
    '/project/:id',
    requireRole(...MANAGEMENT_VIEW_ROLES),
    (req, res, next) => utilizationController.getProjectUtilization(req, res, next)
);

router.get(
    '/dashboard-summary',
    requireRole(...MANAGEMENT_VIEW_ROLES),
    (req, res, next) => utilizationController.getDashboardSummary(req, res, next)
);

router.post(
    '/sync',
    requireRole(ROLES.ADMIN),
    (req, res, next) => utilizationController.syncActuals(req, res, next)
);

export { router as utilizationRouter };
