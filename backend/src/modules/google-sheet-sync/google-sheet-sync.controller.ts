import { Request, Response, NextFunction } from 'express';
import { sheetSyncService, resolveSyncBatchId } from './sheet-sync.service';
import { GoogleSheetWebhookBody } from '../../services/planner-import/types/import-result.types';
import { AppError } from '../../common/errors/app-error';
import { SyncInProgressError } from './sync-errors';
import { extractFailureDetails } from './sync-run-persistence';

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

function webhookFailureStatus(err: unknown): number {
    if (err instanceof AppError) {
        if (err.statusCode >= 400 && err.statusCode < 600) return err.statusCode;
    }
    return 500;
}

export const googleSheetSyncController = {
    async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        const body = req.body as GoogleSheetWebhookBody;
        const requestId = requestIdFrom(req);
        let syncBatchId: string | undefined;

        try {
            if (!body?.sheet || !Array.isArray(body.rows)) {
                res.status(400).json({
                    status: 'FAILED',
                    sheet: body?.sheet ?? null,
                    error: 'Request body must include sheet and rows array.',
                    syncCompleted: false,
                    requestId,
                });
                return;
            }

            const explicitBatchId = syncBatchIdFrom(req, body);
            syncBatchId = await resolveSyncBatchId(explicitBatchId, requestId);
            const result = await sheetSyncService.syncSheet(body, {
                requestId,
                syncBatchId,
            });

            res.status(200).json({
                status: 'SUCCESS',
                syncCompleted: true,
                cached: result.cached === true,
                syncId: result.syncId,
                syncBatchId,
                requestId,
                sheet: result.sheet,
                rowsReceived: result.rowsReceived,
                rowsProcessed: result.rowsProcessed,
                rowsSkipped: result.rowsSkipped,
                durationMs: result.durationMs,
                errors: result.errors,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            if (error instanceof AppError && error.statusCode === 409) {
                res.status(409).json({
                    status: 'FULL_SYNC_RUNNING',
                    message: error.message,
                    syncBatchId,
                    requestId,
                });
                return;
            }

            const details = extractFailureDetails(error);
            const httpStatus = webhookFailureStatus(error);
            const sheet = body?.sheet ?? 'unknown';

            res.status(httpStatus).json({
                status: 'FAILED',
                sheet,
                error: details.message,
                code: details.code,
                codeName: details.codeName,
                errmsg: details.errmsg,
                syncBatchId,
                syncId: undefined,
                requestId,
                syncCompleted: false,
                timestamp: new Date().toISOString(),
            });
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
