import { Router } from 'express';
import { timeEntryController } from './time-entry.controller';

const router = Router();

// POST /api/time-entries - Create new time entry
router.post('/', (req, res, next) => timeEntryController.create(req, res, next));

export { router as timeEntryRouter };
