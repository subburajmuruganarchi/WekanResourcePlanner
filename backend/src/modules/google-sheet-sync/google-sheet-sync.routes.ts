import { Router } from 'express';
import { requireSyncKey } from '../../common/middleware/sync-auth.middleware';
import { requireRole } from '../../common/middleware/role.middleware';
import { googleSheetSyncController } from './google-sheet-sync.controller';

const router = Router();

router.post(
    '/webhook',
    requireSyncKey,
    (req, res, next) => googleSheetSyncController.webhook(req, res, next)
);

router.get(
    '/status',
    requireRole('Admin'),
    (req, res, next) => googleSheetSyncController.status(req, res, next)
);

router.post(
    '/manual',
    requireRole('Admin'),
    (req, res, next) => googleSheetSyncController.manual(req, res, next)
);

router.post(
    '/sync-all',
    requireRole('Admin'),
    (req, res, next) => googleSheetSyncController.syncAll(req, res, next)
);

export { router as googleSheetSyncRouter };
