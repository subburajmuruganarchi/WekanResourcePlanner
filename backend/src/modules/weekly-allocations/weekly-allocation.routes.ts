import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { requireFeature } from '../../common/middleware/feature-flag.middleware';
import { weeklyAllocationController } from './weekly-allocation.controller';

const router = Router();

router.use(requireFeature('weeklyAllocationsEnabled'));
router.use(requireRole());

/** GET /api/weekly-allocations/grid — weekly planning matrix data */
router.get(
    '/grid',
    requireRole('Admin', 'Project Manager'),
    (req, res, next) => weeklyAllocationController.getGrid(req, res, next)
);

/** PUT /api/weekly-allocations/grid — bulk upsert weekly cells */
router.put(
    '/grid',
    requireRole('Admin'),
    (req, res, next) => weeklyAllocationController.putGrid(req, res, next)
);

export { router as weeklyAllocationRouter };
