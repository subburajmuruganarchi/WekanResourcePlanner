import { Router } from 'express';
import { okrController } from './okr.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

// GET /api/okrs — list all OKRs (any authenticated role, controller filters for PM/Employee)
router.get('/', requireRole(), okrController.list);

// GET /api/okrs/periods — list available periods for dropdown
router.get('/periods', requireRole(), okrController.listPeriods);

// GET /api/okrs/employee/:employeeId — get OKRs for a specific employee
router.get('/employee/:employeeId', requireRole(), okrController.getByEmployee);

// POST /api/okrs — create OKR (Admin/PM only)
router.post('/', requireRole('Admin', 'ProjectManager'), okrController.create);

// PUT /api/okrs/:id — update OKR (Admin/PM only)
router.put('/:id', requireRole('Admin', 'ProjectManager'), okrController.update);

// PATCH /api/okrs/:id/progress — update key result progress (Admin/PM/Employee)
router.patch('/:id/progress', requireRole('Admin', 'ProjectManager', 'Employee'), okrController.updateProgress);

// DELETE /api/okrs/:id — delete OKR (Admin only)
router.delete('/:id', requireRole('Admin'), okrController.delete);

export const okrRouter = router;
