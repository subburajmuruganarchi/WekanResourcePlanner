import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { requireFeature } from '../../common/middleware/feature-flag.middleware';
import {
    ALLOCATION_EDIT_ROLES,
    MANAGEMENT_VIEW_ROLES,
    ROLES,
} from '../../common/constants/roles';
import { weeklyAllocationController } from './weekly-allocation.controller';

const router = Router();

router.use(requireFeature('weeklyAllocationsEnabled'));
router.use(requireRole());

router.get(
    '/grid',
    requireRole(...MANAGEMENT_VIEW_ROLES),
    (req, res, next) => weeklyAllocationController.getGrid(req, res, next)
);

router.put(
    '/grid',
    requireRole(...ALLOCATION_EDIT_ROLES),
    (req, res, next) => weeklyAllocationController.putGrid(req, res, next)
);

export { router as weeklyAllocationRouter };
