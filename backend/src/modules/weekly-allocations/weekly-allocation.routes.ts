import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { requireFeature } from '../../common/middleware/feature-flag.middleware';
import { weeklyAllocationController } from './weekly-allocation.controller';
import { weeklyGridGetRoles, weeklyGridPutRoles } from '../../common/utils/mvp-permissions.util';

const router = Router();

router.use(requireFeature('weeklyAllocationsEnabled'));
router.use(requireRole());

router.get(
    '/grid',
    requireRole(...weeklyGridGetRoles()),
    (req, res, next) => weeklyAllocationController.getGrid(req, res, next)
);

router.put(
    '/grid',
    requireRole(...weeklyGridPutRoles()),
    (req, res, next) => weeklyAllocationController.putGrid(req, res, next)
);

export { router as weeklyAllocationRouter };
