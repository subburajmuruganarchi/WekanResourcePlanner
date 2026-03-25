import { Router } from 'express';
import { employeeController } from './employee.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

// GET /api/employees
router.get('/', requireRole(), (req, res, next) => employeeController.list(req, res, next));

// GET /api/employees/:id
router.get('/:id', requireRole(), (req, res, next) => employeeController.getById(req, res, next));

// POST /api/employees - Admin only
router.post('/', requireRole('Admin'), (req, res, next) => employeeController.create(req, res, next));

// PATCH /api/employees/:id - General update (Admin)
router.patch('/:id', requireRole('Admin'), employeeController.update);

// PATCH /api/employees/:id/role - Admin-only: update system access role
router.patch('/:id/role', requireRole('Admin'), (req, res, next) => employeeController.updateRole(req, res, next));

// PATCH /api/employees/:id/access - Admin-only: toggle active/inactive
router.patch('/:id/access', requireRole('Admin'), (req, res, next) => employeeController.updateAccess(req, res, next));

export { router as employeeRouter };
