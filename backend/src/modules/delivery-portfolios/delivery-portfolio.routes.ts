import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { ROLES } from '../../common/constants/roles';
import { deliveryPortfolioController } from './delivery-portfolio.controller';

const router = Router();

router.get(
    '/my-projects',
    requireRole(ROLES.DELIVERY_MANAGER, ROLES.ADMIN),
    (req, res, next) => deliveryPortfolioController.myProjects(req, res, next)
);

router.get('/', requireRole(ROLES.ADMIN), (req, res, next) =>
    deliveryPortfolioController.list(req, res, next)
);

router.post('/assign-delivery-manager', requireRole(ROLES.ADMIN), (req, res, next) =>
    deliveryPortfolioController.assignDeliveryManager(req, res, next)
);

router.get('/:id', requireRole(ROLES.ADMIN), (req, res, next) =>
    deliveryPortfolioController.getById(req, res, next)
);

router.post('/', requireRole(ROLES.ADMIN), (req, res, next) =>
    deliveryPortfolioController.create(req, res, next)
);

router.put('/:id', requireRole(ROLES.ADMIN), (req, res, next) =>
    deliveryPortfolioController.update(req, res, next)
);

router.delete('/:id', requireRole(ROLES.ADMIN), (req, res, next) =>
    deliveryPortfolioController.deactivate(req, res, next)
);

export { router as deliveryPortfolioRouter };
