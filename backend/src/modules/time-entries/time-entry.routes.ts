import { Router } from 'express';
import { TimeCode } from './time-code.model';
import { timeEntryController } from './time-entry.controller';

const router = Router();

// GET /api/time-entries/codes - Get all time codes
router.get('/codes', async (req, res, next) => {
    try {
        const timeCodes = await TimeCode.find({}).lean();
        const response = timeCodes.map((tc) => ({
            id: tc._id.toString(),
            code: tc.code,
            description: tc.description,
            isBillable: tc.isBillable,
        }));
        res.json({ status: 'success', data: response });
    } catch (error) {
        next(error);
    }
});

// POST /api/time-entries - Create new time entry
router.post('/', (req, res, next) => timeEntryController.create(req, res, next));

export { router as timeEntryRouter };
