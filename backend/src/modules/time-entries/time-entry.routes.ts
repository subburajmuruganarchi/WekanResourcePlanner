import { Router } from 'express';
import { TimeCode } from './time-code.model';
import { timeEntryController } from './time-entry.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

// Apply check for all time entry routes
router.use(requireRole());

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

// GET /api/time-entries/daily-forecast - Get daily forecast hours from allocations
router.get('/daily-forecast', (req, res, next) => timeEntryController.getDailyForecast(req, res, next));

// GET /api/time-entries/estimates - Get estimated hours from allocations
router.get('/estimates', (req, res, next) => timeEntryController.getEstimates(req, res, next));

// GET /api/time-entries - List time entries for employee/week
router.get('/', (req, res, next) => timeEntryController.list(req, res, next));

// POST /api/time-entries - Create new time entry
router.post('/', (req, res, next) => timeEntryController.create(req, res, next));

// DELETE /api/time-entries/:id - Delete a time entry
router.delete('/:id', (req, res, next) => timeEntryController.delete(req, res, next));

// POST /api/time-entries/submit - Employee submits weekly entries (DRAFT → SUBMITTED)
router.post('/submit', (req, res, next) => timeEntryController.submit(req, res, next));

// POST /api/time-entries/approve - PM approves entries (SUBMITTED → PM_APPROVED)
router.post('/approve', requireRole('Admin', 'Project Manager'), (req, res, next) => timeEntryController.approve(req, res, next));

// POST /api/time-entries/reject - PM rejects entries (SUBMITTED → PM_REJECTED)
router.post('/reject', requireRole('Admin', 'Project Manager'), (req, res, next) => timeEntryController.reject(req, res, next));

// GET /api/time-entries/pending-approval - Get SUBMITTED entries for PM's projects
router.get('/pending-approval', requireRole('Admin', 'Project Manager'), (req, res, next) => timeEntryController.pendingApproval(req, res, next));

// GET /api/time-entries/by-project/:projectId - Get entries for a specific project with filters
router.get('/by-project/:projectId', requireRole('Admin', 'Project Manager'), (req, res, next) => timeEntryController.byProject(req, res, next));

export { router as timeEntryRouter };
