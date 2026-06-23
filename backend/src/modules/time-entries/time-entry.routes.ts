import { Router } from 'express';
import { TimeCode } from './time-code.model';
import { ensureDefaultTimeCodes, mapTimeCodeResponse, sortTimeCodesForEntry } from './time-code.bootstrap';
import { timeEntryController } from './time-entry.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import { APPROVAL_ROLES } from '../../common/constants/roles';

const router = Router();

router.use(requireRole());

router.get('/codes', async (_req, res, next) => {
    try {
        await ensureDefaultTimeCodes();
        const timeCodes = await TimeCode.find({
            $or: [
                { status: { $exists: false } },
                { status: { $nin: ['Inactive', 'inactive'] } },
            ],
        }).lean();
        const response = sortTimeCodesForEntry(timeCodes.map(mapTimeCodeResponse));
        res.json({ status: 'success', data: response });
    } catch (error) {
        next(error);
    }
});

router.get('/daily-forecast', (req, res, next) => timeEntryController.getDailyForecast(req, res, next));
router.get('/estimates', (req, res, next) => timeEntryController.getEstimates(req, res, next));
router.get('/', (req, res, next) => timeEntryController.list(req, res, next));
router.post('/', (req, res, next) => timeEntryController.create(req, res, next));
router.delete('/:id', (req, res, next) => timeEntryController.delete(req, res, next));
router.post('/submit', (req, res, next) => timeEntryController.submit(req, res, next));

router.post('/approve', requireRole(...APPROVAL_ROLES), (req, res, next) =>
    timeEntryController.approve(req, res, next)
);
router.post('/reject', requireRole(...APPROVAL_ROLES), (req, res, next) =>
    timeEntryController.reject(req, res, next)
);
router.get('/pending-approval', requireRole(...APPROVAL_ROLES), (req, res, next) =>
    timeEntryController.pendingApproval(req, res, next)
);
router.get('/by-project/:projectId', requireRole(...APPROVAL_ROLES), (req, res, next) =>
    timeEntryController.byProject(req, res, next)
);

export { router as timeEntryRouter };
