import { Router } from 'express';
import { allocationController } from './allocation.controller';

const router = Router();

// GET /api/allocations/rank - Rank employees for allocation
router.get('/rank', (req, res, next) => allocationController.rankEmployees(req, res, next));

export { router as allocationRouter };
