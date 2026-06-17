import { Request, Response, NextFunction } from 'express';
import {
    processGoogleSheetWebhook,
    getLatestSyncStatus,
    triggerFullGoogleSheetSync,
} from './google-sheet-sync.service';
import { GoogleSheetWebhookBody } from '../../services/planner-import/types/import-result.types';

export const googleSheetSyncController = {
    webhook(req: Request, res: Response, _next: NextFunction): void {
        const body = req.body as GoogleSheetWebhookBody;
        if (!body?.sheet || !Array.isArray(body.rows)) {
            res.status(400).json({
                success: false,
                message: 'Request body must include sheet and rows array.',
            });
            return;
        }

        void processGoogleSheetWebhook(body).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            console.error(
                `[google-sheet-sync/webhook] Background import failed for sheet "${body.sheet}":`,
                message,
                error
            );
        });

        res.status(202).json({
            status: 'accepted',
            message: 'Import started',
        });
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

    async syncAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const appsScriptResponse = await triggerFullGoogleSheetSync();
            res.status(200).json({
                status: 'success',
                message: 'Full Google Sheet sync triggered',
                data: appsScriptResponse,
            });
        } catch (error) {
            next(error);
        }
    },
};
