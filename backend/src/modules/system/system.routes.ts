import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { createRateLimiter } from '../../common/middleware/rate-limit';
import { systemController } from './system.controller';

const router = Router();

const verifyLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
});

router.use(requireRole('Admin'));

router.get('/health-summary', (req, res, next) =>
    systemController.healthSummary(req, res, next)
);

router.get('/verify', verifyLimiter, (req, res, next) =>
    systemController.verify(req, res, next)
);

export { router as systemRouter };
