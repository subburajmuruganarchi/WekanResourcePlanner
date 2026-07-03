import { Router } from 'express';
import { employeeController } from './employee.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import { employeeCrudRoles } from '../../common/utils/mvp-permissions.util';

const router = Router();
const crudRoles = employeeCrudRoles();

// GET /api/employees
router.get('/', requireRole(), (req, res, next) => employeeController.list(req, res, next));

// GET /api/employees/:id
router.get('/:id', requireRole(), (req, res, next) => employeeController.getById(req, res, next));

// POST /api/employees
router.post('/', requireRole(...crudRoles), (req, res, next) => employeeController.create(req, res, next));

// PATCH /api/employees/:id
router.patch('/:id', requireRole(...crudRoles), employeeController.update);

// PATCH /api/employees/:id/role — Admin + MVP org admins
router.patch('/:id/role', requireRole(...crudRoles), (req, res, next) => employeeController.updateRole(req, res, next));

// PATCH /api/employees/:id/access
router.patch('/:id/access', requireRole(...crudRoles), (req, res, next) => employeeController.updateAccess(req, res, next));

// DELETE /api/employees/:id — soft-delete
router.delete('/:id', requireRole(...crudRoles), (req, res, next) => employeeController.remove(req, res, next));

export { router as employeeRouter };
