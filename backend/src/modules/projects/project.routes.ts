import { Router } from 'express';
import { projectController } from './project.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import { projectCrudRoles, projectUpdateRoles } from '../../common/utils/mvp-permissions.util';

const router = Router();

// All project routes require authentication
router.use(requireRole());

// GET /api/projects
router.get('/', (req, res, next) => projectController.list(req, res, next));

// GET /api/projects/:id
router.get('/:id', (req, res, next) => projectController.getById(req, res, next));

// POST /api/projects
router.post('/', requireRole(...projectCrudRoles()), (req, res, next) => projectController.create(req, res, next));

// PUT /api/projects/:id
router.put('/:id', requireRole(...projectUpdateRoles()), (req, res, next) => projectController.update(req, res, next));

// DELETE /api/projects/:id — soft-delete (is_active=false)
router.delete('/:id', requireRole(...projectCrudRoles()), (req, res, next) => projectController.remove(req, res, next));

export { router as projectRouter };
