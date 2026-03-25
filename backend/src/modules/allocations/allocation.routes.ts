import { Router } from 'express';
import { allocationController } from './allocation.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

// All allocation routes require authentication
router.use(requireRole());

// POST /api/allocations - Create new allocation (Admin only)
router.post('/', requireRole('Admin'), (req, res, next) => allocationController.create(req, res, next));

// PUT /api/allocations/:id - Update allocation (admin override)
router.put('/:id', requireRole('Admin'), (req, res, next) => allocationController.update(req, res, next));

// GET /api/allocations/rank - Rank employees for allocation (PM/Admin)
router.get('/rank', requireRole('Admin', 'Project Manager'), (req, res, next) => allocationController.rankEmployees(req, res, next));

export { router as allocationRouter };

