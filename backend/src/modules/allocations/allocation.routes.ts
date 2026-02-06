import { Router } from 'express';
import { allocationController } from './allocation.controller';

const router = Router();

// POST /api/allocations - Create new allocation
router.post('/', (req, res, next) => allocationController.create(req, res, next));

// PUT /api/allocations/:id - Update allocation (admin override)
router.put('/:id', (req, res, next) => allocationController.update(req, res, next));

// GET /api/allocations/rank - Rank employees for allocation
router.get('/rank', (req, res, next) => allocationController.rankEmployees(req, res, next));

export { router as allocationRouter };

