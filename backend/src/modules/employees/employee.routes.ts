import { Router } from 'express';
import { employeeController } from './employee.controller';

const router = Router();

// GET /api/employees
router.get('/', (req, res, next) => employeeController.list(req, res, next));

// GET /api/employees/:id
router.get('/:id', (req, res, next) => employeeController.getById(req, res, next));

export { router as employeeRouter };
