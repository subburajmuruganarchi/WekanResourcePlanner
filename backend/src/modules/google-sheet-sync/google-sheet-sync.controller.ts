import { Request, Response, NextFunction } from 'express';
import {
    processGoogleSheetWebhook,
    getLatestSyncStatus,
} from './google-sheet-sync.service';
import { GoogleSheetWebhookBody } from '../../services/planner-import/types/import-result.types';

export const googleSheetSyncController = {
    async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as GoogleSheetWebhookBody;
            if (!body?.sheet || !Array.isArray(body.rows)) {
                res.status(400).json({
                    success: false,
                    message: 'Request body must include sheet and rows array.',
                });
                return;
            }

            const result = await processGoogleSheetWebhook(body);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    async status(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = await getLatestSyncStatus();
            res.status(200).json({ status: 'success', data: status });
        } catch (error) {
            next(error);
        }
    },

    async manual(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = await getLatestSyncStatus();
            res.status(200).json({
                status: 'success',
                message:
                    'Google Sheet sync is push-based. Trigger sync from Google Apps Script webhook, or upload Excel files below.',
                data: status,
            });
        } catch (error) {
            next(error);
        }
    },
};
