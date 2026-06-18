import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/app-error';
import { structuredLogger } from '../../common/logger';
import { runPlannerSheetImport } from '../../services/planner-import/planner-import.service';
import {
    GoogleSheetWebhookBody,
    GoogleSheetSyncResponse,
    FullSyncSummary,
    SheetSyncSummary,
    PlannerImportResult,
    FullSyncJobStatusResponse,
} from '../../services/planner-import/types/import-result.types';
import {
    googleSheetRowsToResourceRows,
    googleSheetRowsToProjectRows,
    googleSheetRowsToAllocationRows,
    extractWeekHeadersFromWebhook,
} from '../../services/planner-import/adapters/google-sheet-row.adapter';
import { SyncRun } from './sync-run.model';
import { SyncBatch } from './sync-batch.model';
import { FULL_SYNC_LOCK, syncLockService } from './sync-lock.service';
import { SyncInProgressError } from './sync-errors';
import { validateSheetResult, assertFullSyncSummary } from './sheet-sync.validation';
import { acquireSyncRun, syncResponseFromRun } from './sync-run-idempotency';
import {
    waitForSheetPrerequisites,
    markBatchSheetCompleted,
    ensureSyncBatch,
    type SupportedSheet,
} from './sync-batch-coordinator';
import { buildBatchSheetStatus } from './sheet-sync.status';

export type { SupportedSheet };

const SHEET_ORDER: SupportedSheet[] = ['Resource', 'Project', 'Project_Allocation'];
const APPS_SCRIPT_SYNC_TIMEOUT_MS = 300_000;

const SHEET_IMPORT_LOG: Record<
    SupportedSheet,
    { start: string; success: string }
> = {
    Resource: {
        start: 'RESOURCE IMPORT START',
        success: 'RESOURCE IMPORT SUCCESS',
    },
    Project: {
        start: 'PROJECT IMPORT START',
        success: 'PROJECT IMPORT SUCCESS',
    },
    Project_Allocation: {
        start: 'ALLOCATION IMPORT START',
        success: 'ALLOCATION IMPORT SUCCESS',
    },
};

export interface SyncSheetOptions {
    requestId?: string;
    syncBatchId?: string;
}

function syncRequestId(explicit?: string): string {
    return explicit?.trim() ? explicit.trim() : `SYNC-${uuidv4()}`;
}

function generateBatchId(): string {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `FULLSYNC-${ymd}-${uuidv4()}`;
}

async function assertWebhookAllowed(syncBatchId?: string): Promise<void> {
    const active = await syncLockService.getActiveLock(FULL_SYNC_LOCK);
    if (!active?.batchId) return;

    if (!syncBatchId || syncBatchId !== active.batchId) {
        throw new AppError('Full sync is in progress. Retry after it completes.', 409);
    }
}

async function markBatchSheetRunning(
    batchId: string,
    sheet: SupportedSheet,
    requestId: string
): Promise<void> {
    await ensureSyncBatch(batchId, requestId);
    const runningProgress =
        sheet === 'Resource' ? 5 : sheet === 'Project' ? 38 : 72;
    await SyncBatch.updateOne(
        { batchId },
        {
            $set: {
                status: 'RUNNING',
                currentSheet: sheet,
                progress: runningProgress,
            },
        }
    );
    await SyncBatch.updateOne(
        { batchId, 'sheets.sheet': sheet },
        { $set: { 'sheets.$.status': 'RUNNING' } }
    );
}

async function markBatchSheetFailed(
    batchId: string,
    sheet: SupportedSheet,
    error: string
): Promise<void> {
    await SyncBatch.updateOne(
        { batchId, 'sheets.sheet': sheet },
        {
            $set: {
                'sheets.$.status': 'FAILED',
                'sheets.$.errors': [error],
            },
        }
    );
}

/**
 * Single sync service — Apps Script webhook (Flow 1) and UI full sync (Flow 2).
 */
export const sheetSyncService = {
    async syncSheet(
        body: GoogleSheetWebhookBody,
        options: SyncSheetOptions = {}
    ): Promise<GoogleSheetSyncResponse> {
        const rid = syncRequestId(options.requestId);
        return this.syncSheetInternal(body, rid, options.syncBatchId);
    },

    async syncSheetInternal(
        body: GoogleSheetWebhookBody,
        requestId: string,
        syncBatchId?: string
    ): Promise<GoogleSheetSyncResponse> {
        const sheet = body.sheet as SupportedSheet;
        const startedAt = Date.now();
        const received = body.rows?.length ?? 0;

        await assertWebhookAllowed(syncBatchId);

        structuredLogger.info('START SHEET IMPORT', {
            requestId,
            syncBatchId,
            sheet,
            rowsReceived: received,
        });

        if (!SHEET_ORDER.includes(sheet)) {
            throw new AppError(
                `Unsupported sheet: ${sheet}. Use Resource, Project, or Project_Allocation.`,
                400
            );
        }

        if (syncBatchId) {
            await markBatchSheetRunning(syncBatchId, sheet, requestId);
        }

        await waitForSheetPrerequisites(sheet, syncBatchId, requestId);

        const syncId = uuidv4();
        const { run: syncRun, mode: acquireMode } = await acquireSyncRun({
            syncBatchId,
            sheet,
            received,
            syncId,
            allowRetry: body.retry === true,
        });

        if (acquireMode === 'cached' || acquireMode === 'waited') {
            if (syncRun.status === 'SUCCESS') {
                structuredLogger.info('SHEET IMPORT IDEMPOTENT HIT', {
                    requestId,
                    syncBatchId,
                    sheet,
                    mode: acquireMode,
                });
                return syncResponseFromRun(syncRun, requestId);
            }
            if (syncRun.status === 'FAILED') {
                throw new AppError(
                    syncRun.errorMessages?.[0] ?? `${sheet} import failed`,
                    422
                );
            }
        }

        structuredLogger.info(SHEET_IMPORT_LOG[sheet].start, {
            requestId,
            syncBatchId,
            sheet,
            rowsReceived: received,
        });

        try {
            let result: PlannerImportResult;

            if (sheet === 'Resource') {
                const resourceRows = googleSheetRowsToResourceRows(body.rows ?? []);
                result = await runPlannerSheetImport({
                    resourceRows,
                    resourceOnly: true,
                    syncId,
                    syncBatchId,
                    atomic: true,
                });
            } else if (sheet === 'Project') {
                const projectRows = googleSheetRowsToProjectRows(body.rows ?? []);
                result = await runPlannerSheetImport({
                    projectRows,
                    syncId,
                    syncBatchId,
                    atomic: true,
                });
            } else {
                const weekHeaders = extractWeekHeadersFromWebhook(body.rows ?? [], body.weekHeaders);
                const allocationRows = googleSheetRowsToAllocationRows(body.rows ?? [], weekHeaders);
                result = await runPlannerSheetImport({
                    allocationRows,
                    syncId,
                    syncBatchId,
                    atomic: true,
                });
            }

            validateSheetResult(sheet, received, result);

            const durationMs = Date.now() - startedAt;
            const response: GoogleSheetSyncResponse = {
                success: true,
                sheet,
                rowsReceived: received,
                rowsProcessed: result.rowsProcessed ?? 0,
                rowsSkipped: result.rowsSkipped ?? 0,
                errors: [],
                skippedRows: result.skippedRows,
                syncRunId: syncRun._id.toString(),
                syncId,
                requestId,
                durationMs,
            };

            await SyncRun.findByIdAndUpdate(syncRun._id, {
                completedAt: new Date(),
                rowsProcessed: response.rowsProcessed,
                rowsSkipped: response.rowsSkipped,
                errorMessages: [],
                skippedRows: response.skippedRows,
                status: 'SUCCESS',
            });

            if (syncBatchId) {
                await markBatchSheetCompleted(
                    syncBatchId,
                    sheet,
                    received,
                    response.rowsProcessed
                );
            }

            structuredLogger.info(SHEET_IMPORT_LOG[sheet].success, {
                requestId,
                syncBatchId,
                sheet,
                rowsReceived: received,
                rowsProcessed: response.rowsProcessed,
                durationMs,
            });

            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await SyncRun.findByIdAndUpdate(syncRun._id, {
                completedAt: new Date(),
                errorMessages: [message],
                status: 'FAILED',
            });
            if (syncBatchId) {
                await markBatchSheetFailed(syncBatchId, sheet, message);
                await SyncBatch.updateOne(
                    { batchId: syncBatchId },
                    {
                        $set: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            failureMessages: [message],
                        },
                    }
                );
            }
            structuredLogger.error('SYNC_FAILED', {
                requestId,
                syncBatchId,
                sheet,
                error: message,
                stack: err instanceof Error ? err.stack : undefined,
            });
            throw err;
        }
    },

    /** Start async full sync — returns immediately with batch id. */
    async startFullSync(
        requestId?: string
    ): Promise<{
        syncId: string;
        syncBatchId: string;
        status: 'STARTED';
        requestId: string;
    }> {
        const rid = syncRequestId(requestId);
        const batchId = generateBatchId();

        const active = await syncLockService.getActiveLock(FULL_SYNC_LOCK);
        if (active) {
            throw new SyncInProgressError('Sync already in progress', active.batchId);
        }

        const acquired = await syncLockService.tryAcquire(FULL_SYNC_LOCK, rid, batchId);
        if (!acquired) {
            const stillActive = await syncLockService.getActiveLock(FULL_SYNC_LOCK);
            throw new SyncInProgressError(
                'Sync already in progress',
                stillActive?.batchId
            );
        }

        await SyncBatch.create({
            batchId,
            status: 'STARTED',
            startedAt: new Date(),
            triggeredBy: 'UI',
            requestId: rid,
            progress: 0,
            sheets: SHEET_ORDER.map((sheet) => ({
                sheet,
                status: 'PENDING' as const,
            })),
            resourceCompleted: false,
            projectCompleted: false,
            allocationCompleted: false,
            failureMessages: [],
        });

        structuredLogger.info('START FULL SYNC', { requestId: rid, syncBatchId: batchId });

        void executeFullSyncJob(batchId, rid).catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            structuredLogger.error('FULL SYNC JOB CRASHED', {
                requestId: rid,
                syncBatchId: batchId,
                error: message,
            });
        });

        return { syncId: batchId, syncBatchId: batchId, status: 'STARTED', requestId: rid };
    },

    async getFullSyncJobStatus(syncBatchId: string): Promise<FullSyncJobStatusResponse> {
        const batch = await SyncBatch.findOne({ batchId: syncBatchId }).lean();
        if (!batch) {
            throw new AppError(`Sync job not found: ${syncBatchId}`, 404);
        }

        const sheetState = (
            name: SupportedSheet
        ): 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' =>
            buildBatchSheetStatus(batch.sheets)[name];

        const durationMs = batch.completedAt
            ? batch.completedAt.getTime() - batch.startedAt.getTime()
            : Date.now() - batch.startedAt.getTime();

        return {
            status: batch.status,
            syncId: batch.batchId,
            syncBatchId: batch.batchId,
            requestId: batch.requestId,
            currentSheet: batch.currentSheet,
            progress: batch.progress,
            sheets: {
                Resource: sheetState('Resource'),
                Project: sheetState('Project'),
                Project_Allocation: sheetState('Project_Allocation'),
            },
            summary: batch.summary,
            errors: batch.failureMessages ?? [],
            syncCompleted: batch.status === 'SUCCESS' || batch.status === 'FAILED',
            durationMs,
            timestamp: (batch.completedAt ?? batch.startedAt).toISOString(),
        };
    },

    async getLatestSyncStatus(): Promise<{
        sheets: Array<{
            sheet: string;
            lastSyncAt: string | null;
            status: string | null;
            rowsReceived: number;
            rowsProcessed: number;
            rowsSkipped: number;
            errors: string[];
        }>;
    }> {
        const results = await Promise.all(
            SHEET_ORDER.map(async (sheet) => {
                const latest = await SyncRun.findOne({ sheet }).sort({ startedAt: -1 }).lean();
                return {
                    sheet,
                    lastSyncAt:
                        latest?.completedAt?.toISOString() ??
                        latest?.startedAt?.toISOString() ??
                        null,
                    status: latest?.status ?? null,
                    rowsReceived: latest?.rowsReceived ?? 0,
                    rowsProcessed: latest?.rowsProcessed ?? 0,
                    rowsSkipped: latest?.rowsSkipped ?? 0,
                    errors: latest?.errorMessages ?? [],
                };
            })
        );
        return { sheets: results };
    },
};

async function executeFullSyncJob(batchId: string, requestId: string): Promise<void> {
    const startedAt = Date.now();
    try {
        await SyncBatch.updateOne({ batchId }, { $set: { status: 'RUNNING' } });

        const appsScriptResponse = await triggerAppsScriptFullSync(requestId, batchId);
        const summary = await buildBatchSummary(batchId);
        assertFullSyncSummary(summary);

        const durationMs = Date.now() - startedAt;
        await SyncBatch.updateOne(
            { batchId },
            {
                $set: {
                    status: 'SUCCESS',
                    completedAt: new Date(),
                    progress: 100,
                    summary,
                    failureMessages: [],
                },
            }
        );

        structuredLogger.info('FULL SYNC SUCCESS', {
            requestId,
            syncBatchId: batchId,
            durationMs,
            resource: summary.resource.processed,
            project: summary.project.processed,
            allocation: summary.allocation.processed,
            appsScriptResponse,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await SyncBatch.updateOne(
            { batchId },
            {
                $set: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    failureMessages: [message],
                },
            }
        );
        structuredLogger.error('FULL SYNC FAILED', {
            requestId,
            syncBatchId: batchId,
            error: message,
        });
    } finally {
        await syncLockService.release(FULL_SYNC_LOCK, requestId);
    }
}

async function triggerAppsScriptFullSync(requestId: string, batchId: string): Promise<unknown> {
    const url = env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;
    if (!url) {
        throw new AppError(
            'Google Apps Script web app URL is not configured (GOOGLE_APPS_SCRIPT_WEB_APP_URL).',
            503
        );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_SYNC_TIMEOUT_MS);

    try {
        structuredLogger.info('Calling Apps Script full sync', { requestId, syncBatchId: batchId });
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Id': requestId,
                'X-Sync-Batch-Id': batchId,
            },
            body: JSON.stringify({ batchId }),
            signal: controller.signal,
            redirect: 'follow',
        });

        const text = await response.text();
        if (!response.ok) {
            throw new AppError(
                `Google Apps Script sync failed (${response.status}): ${text.slice(0, 500)}`,
                502
            );
        }

        try {
            return JSON.parse(text) as unknown;
        } catch {
            return { raw: text };
        }
    } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.name === 'AbortError') {
            throw new AppError('Google Apps Script sync timed out after 5 minutes.', 504);
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(`Failed to trigger Google Apps Script sync: ${message}`, 502);
    } finally {
        clearTimeout(timeout);
    }
}

async function buildBatchSummary(batchId: string): Promise<FullSyncSummary> {
    const runs = await SyncRun.find({ syncBatchId: batchId }).lean();
    const runBySheet = new Map(runs.map((r) => [r.sheet, r]));

    const build = (sheet: SupportedSheet): SheetSyncSummary => {
        const run = runBySheet.get(sheet);
        return {
            received: run?.rowsReceived ?? 0,
            processed: run?.rowsProcessed ?? 0,
            skipped: run?.rowsSkipped ?? 0,
            upserted: run?.rowsProcessed ?? 0,
            errors: run?.errorMessages ?? [],
            status: run?.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
            lastSyncAt: run?.completedAt?.toISOString() ?? run?.startedAt?.toISOString() ?? null,
        };
    };

    return {
        resource: build('Resource'),
        project: build('Project'),
        allocation: build('Project_Allocation'),
    };
}

export const processGoogleSheetWebhook = (
    body: GoogleSheetWebhookBody,
    options?: SyncSheetOptions
) => sheetSyncService.syncSheet(body, options);

export const getLatestSyncStatus = () => sheetSyncService.getLatestSyncStatus();
