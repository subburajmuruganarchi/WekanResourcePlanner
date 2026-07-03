import { Router } from 'express';
import { allocationController } from './allocation.controller';
import { requireRole } from '../../common/middleware/role.middleware';
import {
    ALLOCATION_EDIT_ROLES,
    MANAGEMENT_VIEW_ROLES,
    ROLES,
} from '../../common/constants/roles';
import { features } from '../../config/features';

const router = Router();

router.use(requireRole());

function allocationWriteRoles(): string[] {
    if (features.mvpMode) {
        return [ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER, ROLES.ADMIN];
    }
    return [...ALLOCATION_EDIT_ROLES, ROLES.PROJECT_MANAGER];
}

router.post('/', requireRole(...allocationWriteRoles()), (req, res, next) =>
    allocationController.create(req, res, next)
);

router.put('/:id', requireRole(...allocationWriteRoles()), (req, res, next) =>
    allocationController.update(req, res, next)
);

router.get('/rank', requireRole(...MANAGEMENT_VIEW_ROLES), (req, res, next) =>
    allocationController.rankEmployees(req, res, next)
);

export { router as allocationRouter };
