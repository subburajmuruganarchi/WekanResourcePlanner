import { Router } from 'express';
import { roleController } from './role.controller';
import { requireRole } from '../../common/middleware/role.middleware';

const router = Router();

// Any authenticated user can list roles
router.get('/', requireRole(), (req, res, next) => roleController.list(req, res, next));

export { router as roleRouter };
