import { Router } from 'express';
import { requireRole } from '../../common/middleware/role.middleware';
import { aiController } from './ai.controller';

const router = Router();

router.use(requireRole());

router.get('/dashboard-summary', requireRole('Admin', 'Project Manager'), (req, res, next) =>
    aiController.dashboardSummary(req, res, next)
);

router.get('/allocation/explain', requireRole('Admin', 'Project Manager'), (req, res, next) =>
    aiController.explainAllocation(req, res, next)
);

router.get('/staffing-risk/:projectId', requireRole('Admin', 'Project Manager'), (req, res, next) =>
    aiController.staffingRisk(req, res, next)
);

router.get('/approval-anomalies', requireRole('Admin', 'Project Manager'), (req, res, next) =>
    aiController.approvalAnomalies(req, res, next)
);

router.get('/time-entry-suggestions', requireRole(), (req, res, next) =>
    aiController.timeEntrySuggestions(req, res, next)
);

export { router as aiRouter };
