import { Router } from 'express';
import { dashboardController } from './dashboard.controller';

const router = Router();

router.get('/stats', dashboardController.getStats);

export { router as dashboardRouter };
