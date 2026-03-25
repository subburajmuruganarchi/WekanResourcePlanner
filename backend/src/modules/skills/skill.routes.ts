import { Router } from 'express';
import { skillController } from './skill.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

// Any authenticated user can list skills
router.get('/', requireRole(), (req, res, next) => skillController.list(req, res, next));

// Only Admin can create, update, or delete skills
router.post('/', requireRole('Admin'), (req, res, next) => skillController.create(req, res, next));
router.patch('/:id', requireRole('Admin'), (req, res, next) => skillController.update(req, res, next));
router.delete('/:id', requireRole('Admin'), (req, res, next) => skillController.delete(req, res, next));

export { router as skillRouter };
