import { Router } from 'express';
import { features } from '../../config/features';
import { configController } from './config.controller';

const router = Router();

/** Public feature flags for frontend MVP gating (no auth required). */
router.get('/features', (req, res, next) => configController.features(req, res, next));

export { router as configRouter };
