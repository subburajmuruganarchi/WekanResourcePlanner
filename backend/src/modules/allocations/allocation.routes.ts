import { Router } from 'express';
import { allocationController } from './allocation.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import {
    ALLOCATION_EDIT_ROLES,
    MANAGEMENT_VIEW_ROLES,
    ROLES,
} from '../../common/constants/roles';

const router = Router();

router.use(requireRole());

router.post('/', requireRole(...ALLOCATION_EDIT_ROLES, ROLES.PROJECT_MANAGER), (req, res, next) =>
    allocationController.create(req, res, next)
);

router.put('/:id', requireRole(...ALLOCATION_EDIT_ROLES, ROLES.PROJECT_MANAGER), (req, res, next) =>
    allocationController.update(req, res, next)
);

router.get('/rank', requireRole(...MANAGEMENT_VIEW_ROLES), (req, res, next) =>
    allocationController.rankEmployees(req, res, next)
);

export { router as allocationRouter };
