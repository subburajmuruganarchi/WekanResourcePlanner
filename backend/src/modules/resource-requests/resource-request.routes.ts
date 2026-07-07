import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { resourceRequestController } from './resource-request.controller';
import { ROLES } from '../../common/constants/roles';

const router = Router();

router.use(requireRole());

router.get('/', (req, res, next) => resourceRequestController.list(req, res, next));

router.post(
    '/',
    requireRole(
        ROLES.ADMIN,
        ROLES.DELIVERY_MANAGER,
        ROLES.PROJECT_MANAGER,
        ROLES.EMPLOYEE,
        ROLES.USER,
        ROLES.CEO
    ),
    (req, res, next) => resourceRequestController.create(req, res, next)
);

router.patch('/:id/review', (req, res, next) =>
    resourceRequestController.review(req, res, next)
);

router.patch('/:id/cancel', (req, res, next) =>
    resourceRequestController.cancel(req, res, next)
);

export const resourceRequestRouter = router;
