import { Request, Response, NextFunction } from 'express';
import { sheetSyncService } from './sheet-sync.service';
import { GoogleSheetWebhookBody } from '../../services/planner-import/types/import-result.types';
import { AppError } from '../../common/errors/app-error';
import { SyncInProgressError } from './sync-errors';

function requestIdFrom(req: Request): string {
    return req.requestId ?? `SYNC-${Date.now()}`;
}

function syncBatchIdFrom(req: Request, body: GoogleSheetWebhookBody): string | undefined {
    const header = req.headers['x-sync-batch-id'];
    if (typeof header === 'string' && header.trim()) return header.trim();
    if (body.syncBatchId?.trim()) return body.syncBatchId.trim();
    if (body.batchId?.trim()) return body.batchId.trim();
    return undefined;
}

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

            const requestId = requestIdFrom(req);
            const syncBatchId = syncBatchIdFrom(req, body);
            const result = await sheetSyncService.syncSheet(body, { requestId, syncBatchId });

            res.status(200).json({
                status: 'success',
                syncCompleted: true,
                syncId: result.syncId,
                syncBatchId,
                requestId,
                sheet: result.sheet,
                received: result.rowsReceived,
                processed: result.rowsProcessed,
                failed: result.rowsSkipped,
                durationMs: result.durationMs,
                errors: result.errors,
                timestamp: new Date().toISOString(),
                data: result,
            });
        } catch (error) {
            if (error instanceof AppError && error.statusCode === 409) {
                res.status(409).json({
                    status: 'FULL_SYNC_RUNNING',
                    message: error.message,
                });
                return;
            }
            next(error);
        }
    },

    async syncFull(req: Request, res: Response, next: NextFunction): Promise<void> {
        return googleSheetSyncController.syncAll(req, res, next);
    },

    async syncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const syncBatchId = req.params.syncBatchId ?? req.params.syncId;
            const job = await sheetSyncService.getFullSyncJobStatus(syncBatchId);
            const httpStatus =
                job.status === 'SUCCESS' ? 200 : job.status === 'FAILED' ? 200 : 202;
            res.status(httpStatus).json(job);
        } catch (error) {
            next(error);
        }
    },

    async status(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = await sheetSyncService.getLatestSyncStatus();
            res.status(200).json({ status: 'success', data: status });
        } catch (error) {
            next(error);
        }
    },

    async syncAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestId = requestIdFrom(req);
            const started = await sheetSyncService.startFullSync(requestId);
            res.status(202).json({
                ...started,
                message: 'Full sync started',
                syncCompleted: false,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            if (error instanceof SyncInProgressError) {
                res.status(409).json({
                    status: 'RUNNING',
                    message: error.message,
                    syncBatchId: error.activeSyncBatchId,
                    syncCompleted: false,
                });
                return;
            }
            if (error instanceof AppError && error.statusCode === 409) {
                res.status(409).json({
                    status: 'SYNC_ALREADY_RUNNING',
                    message: error.message,
                    syncCompleted: false,
                });
                return;
            }
            next(error);
        }
    },

    async syncAllStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        return googleSheetSyncController.syncStatus(req, res, next);
    },
};
