import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/app-error';
import { structuredLogger } from '../../common/logger';
import { postJsonToAppsScriptWebApp } from '../../common/http/apps-script-fetch';
import { runPlannerSheetImport } from '../../services/planner-import/planner-import.service';
import { ResourceValidationError } from '../../services/planner-import/resource-row.validation';
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
    googleSheetRowsToImportableResourceRows,
    googleSheetRowsToImportableAllocationRows,
    googleSheetRowsToProjectRows,
    googleSheetRowsToAllocationRows,
    extractWeekHeadersFromWebhook,
    coerceWebhookRows,
} from '../../services/planner-import/adapters/google-sheet-row.adapter';
import { SyncRun } from './sync-run.model';
import { SyncBatch } from './sync-batch.model';
import { FULL_SYNC_LOCK, syncLockService } from './sync-lock.service';
import { SyncInProgressError } from './sync-errors';
import { validateSheetResult, assertFullSyncSummary } from './sheet-sync.validation';
import { acquireSyncRun, syncResponseFromRun } from './sync-run-idempotency';
import {
    persistSyncRunFailure,
    persistSyncRunSuccess,
} from './sync-run-persistence';
import { waitForBatchSheetRuns } from './sync-batch-wait';
import {
    waitForSheetPrerequisites,
    markBatchSheetCompleted,
    ensureSyncBatch,
    cascadeBatchSheetFailure,
    type SupportedSheet,
} from './sync-batch-coordinator';
import { buildBatchSheetStatus } from './sheet-sync.status';

export type { SupportedSheet };

/** Webhook tab name; Weekly Planner imports using Project_Allocation logic. */
type WebhookSheet = SupportedSheet | 'Weekly Planner';

const SHEET_ORDER: SupportedSheet[] = ['Resource', 'Project', 'Project_Allocation'];

function parseWebhookSheet(raw: string | undefined): WebhookSheet {
    const sheet = raw?.trim();
    if (!sheet) {
        throw new AppError('Missing sheet name', 400);
    }
    if (SHEET_ORDER.includes(sheet as SupportedSheet)) {
        return sheet as SupportedSheet;
    }
    if (sheet === 'Weekly Planner') {
        return 'Weekly Planner';
    }
    throw new AppError(
        `Unsupported sheet: ${sheet}. Use Resource, Project, Project_Allocation, or Weekly Planner.`,
        400
    );
}

function webhookToImportSheet(sheet: WebhookSheet): SupportedSheet {
    return sheet === 'Weekly Planner' ? 'Project_Allocation' : sheet;
}
/** Only wait this long for GAS web app to accept the kickoff request. */
const APPS_SCRIPT_KICKOFF_TIMEOUT_MS = 30_000;
/** Background job waits for all sheet webhooks (not limited by GAS runtime). */
export const FULL_SYNC_BATCH_TIMEOUT_MS = 1_200_000;

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

/**
 * Resolve batch id from webhook header/body, or attach to active FULL_SYNC lock
 * when Apps Script omitted syncBatchId.
 */
export async function resolveSyncBatchId(
    explicit: string | undefined,
    requestId: string
): Promise<string | undefined> {
    const trimmed = explicit?.trim();
    if (trimmed) return trimmed;

    const active = await syncLockService.getActiveLock(FULL_SYNC_LOCK);
    if (active?.batchId) {
        structuredLogger.warn('WEBHOOK_MISSING_SYNC_BATCH_ID', {
            requestId,
            resolvedSyncBatchId: active.batchId,
        });
        return active.batchId;
    }
    return undefined;
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
        const syncBatchId = await resolveSyncBatchId(options.syncBatchId, rid);
        return this.syncSheetInternal(body, rid, syncBatchId);
    },

    async syncSheetInternal(
        body: GoogleSheetWebhookBody,
        requestId: string,
        syncBatchId?: string
    ): Promise<GoogleSheetSyncResponse> {
        const webhookSheet = parseWebhookSheet(body.sheet);
        const importSheet = webhookToImportSheet(webhookSheet);
        const startedAt = Date.now();
        const received = body.rows?.length ?? 0;

        await assertWebhookAllowed(syncBatchId);

        structuredLogger.info('START SHEET IMPORT', {
            requestId,
            syncBatchId,
            sheet: webhookSheet,
            importSheet,
            rowsReceived: received,
        });

        if (syncBatchId) {
            await markBatchSheetRunning(syncBatchId, importSheet, requestId);
        }

        await waitForSheetPrerequisites(importSheet, syncBatchId, requestId);

        const syncId = uuidv4();
        const { run: syncRun, mode: acquireMode } = await acquireSyncRun({
            syncBatchId,
            sheet: webhookSheet,
            received,
            syncId,
            allowRetry: body.retry === true,
        });

        if (acquireMode === 'cached' || acquireMode === 'waited') {
            if (syncRun.status === 'SUCCESS') {
                structuredLogger.info('SHEET IMPORT IDEMPOTENT HIT', {
                    requestId,
                    syncBatchId,
                    sheet: webhookSheet,
                    mode: acquireMode,
                    cached: acquireMode === 'cached',
                });
                return { ...syncResponseFromRun(syncRun, requestId), cached: acquireMode === 'cached' };
            }
            if (syncRun.status === 'FAILED') {
                const reason =
                    syncRun.errorMessage ??
                    syncRun.errorMessages?.[0] ??
                    `${webhookSheet} import failed`;
                throw new AppError(reason, 422);
            }
        }

        structuredLogger.info(SHEET_IMPORT_LOG[importSheet].start, {
            requestId,
            syncBatchId,
            sheet: webhookSheet,
            importSheet,
            rowsReceived: received,
        });

        try {
            let result: PlannerImportResult;
            let rowsImported = received;
            let rawRowsReceived: number | undefined;
            let rowsFilteredFromSheet: number | undefined;
            const normalizedRows = coerceWebhookRows(body.rows, body.headers);

            if (importSheet === 'Resource') {
                rawRowsReceived = body.rows?.length ?? 0;
                const resourceRows = googleSheetRowsToImportableResourceRows(normalizedRows);
                const skippedRowCount = rawRowsReceived - resourceRows.length;
                rowsFilteredFromSheet = skippedRowCount;

                structuredLogger.info('RESOURCE ROW FILTER', {
                    requestId,
                    syncBatchId,
                    rawRowCount: rawRowsReceived,
                    importableRowCount: resourceRows.length,
                    skippedRowCount,
                });

                result = await runPlannerSheetImport({
                    resourceRows,
                    resourceOnly: true,
                    syncId,
                    syncBatchId,
                    atomic: true,
                });

                rowsImported = resourceRows.length;
                validateSheetResult(importSheet, rowsImported, result);
            } else if (importSheet === 'Project') {
                const projectRows = googleSheetRowsToProjectRows(normalizedRows);
                result = await runPlannerSheetImport({
                    projectRows,
                    syncId,
                    syncBatchId,
                    atomic: true,
                });
                rowsImported = projectRows.length;
                validateSheetResult(importSheet, rowsImported, result);
            } else {
                rawRowsReceived = body.rows?.length ?? 0;
                const weekHeaders = extractWeekHeadersFromWebhook(normalizedRows, body.weekHeaders);
                const allocationRows = googleSheetRowsToImportableAllocationRows(
                    normalizedRows,
                    weekHeaders
                );
                rowsFilteredFromSheet = rawRowsReceived - allocationRows.length;

                structuredLogger.info('ALLOCATION ROW FILTER', {
                    requestId,
                    syncBatchId,
                    rawRowCount: rawRowsReceived,
                    importableRowCount: allocationRows.length,
                    skippedRowCount: rowsFilteredFromSheet,
                });

                result = await runPlannerSheetImport({
                    allocationRows,
                    syncId,
                    syncBatchId,
                    atomic: true,
                });

                rowsImported = allocationRows.length;
                validateSheetResult(importSheet, rowsImported, result);
            }

            const durationMs = Date.now() - startedAt;
            const response: GoogleSheetSyncResponse = {
                success: true,
                sheet: webhookSheet,
                rowsReceived: rowsImported,
                rowsProcessed: result.rowsProcessed ?? 0,
                rowsSkipped: result.rowsSkipped ?? 0,
                errors: [],
                skippedRows: result.skippedRows,
                syncRunId: syncRun._id.toString(),
                syncId,
                requestId,
                durationMs,
            };
            if (importSheet === 'Resource' || importSheet === 'Project_Allocation') {
                response.rawRowsReceived = rawRowsReceived;
                response.rowsFilteredFromSheet = rowsFilteredFromSheet;
            }

            const rowsFilteredFromSheetCount = rowsFilteredFromSheet ?? 0;
            await persistSyncRunSuccess(syncRun._id, {
                rowsReceived: rowsImported,
                rowsProcessed: response.rowsProcessed,
                rowsSkipped: rowsFilteredFromSheetCount + (response.rowsSkipped ?? 0),
                skippedRows: response.skippedRows,
            });

            if (syncBatchId) {
                await markBatchSheetCompleted(
                    syncBatchId,
                    importSheet,
                    rowsImported,
                    response.rowsProcessed
                );
            }

            structuredLogger.info(SHEET_IMPORT_LOG[importSheet].success, {
                event: 'SHEET_SYNC_COMPLETED',
                requestId,
                syncBatchId,
                sheet: webhookSheet,
                importSheet,
                status: 'SUCCESS',
                rowsReceived: rowsImported,
                rowsProcessed: response.rowsProcessed,
                durationMs,
            });

            return response;
        } catch (err) {
            const { message } = await persistSyncRunFailure(syncRun._id, err);
            if (err instanceof ResourceValidationError) {
                structuredLogger.error('RESOURCE_IMPORT_FAILED', {
                    event: 'RESOURCE_IMPORT_FAILED',
                    requestId,
                    syncBatchId,
                    syncId,
                    sheet: webhookSheet,
                    errors: err.errors,
                    validationReport: err.validationReport,
                });
            }
            if (syncBatchId) {
                await markBatchSheetFailed(syncBatchId, importSheet, message);
                await cascadeBatchSheetFailure(syncBatchId, importSheet, message);
                await SyncBatch.updateOne(
                    { batchId: syncBatchId },
                    {
                        $set: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            failureMessages: [`${webhookSheet}: ${message}`],
                        },
                    }
                );
            }
            structuredLogger.error('SYNC_FAILED', {
                event:
                    importSheet === 'Resource'
                        ? 'RESOURCE_IMPORT_FAILED'
                        : importSheet === 'Project'
                          ? 'PROJECT_IMPORT_FAILED'
                          : 'ALLOCATION_IMPORT_FAILED',
                requestId,
                syncBatchId,
                syncId,
                sheet: webhookSheet,
                importSheet,
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

        const sheets = {
            Resource: sheetState('Resource'),
            Project: sheetState('Project'),
            Project_Allocation: sheetState('Project_Allocation'),
        };

        const anyFailed = Object.values(sheets).some((s) => s === 'FAILED');
        const allSuccess = Object.values(sheets).every((s) => s === 'SUCCESS');
        const derivedStatus =
            batch.status === 'FAILED' || anyFailed
                ? 'FAILED'
                : allSuccess
                  ? 'SUCCESS'
                  : batch.status;

        const durationMs = batch.completedAt
            ? batch.completedAt.getTime() - batch.startedAt.getTime()
            : Date.now() - batch.startedAt.getTime();

        return {
            status: derivedStatus,
            syncId: batch.batchId,
            syncBatchId: batch.batchId,
            requestId: batch.requestId,
            currentSheet: batch.currentSheet,
            progress: batch.progress,
            sheets,
            summary: batch.summary,
            errors: batch.failureMessages ?? [],
            syncCompleted: derivedStatus === 'SUCCESS' || derivedStatus === 'FAILED',
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

        kickoffAppsScriptFullSync(requestId, batchId);
        await waitForBatchSheetRuns(batchId, requestId, FULL_SYNC_BATCH_TIMEOUT_MS);
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

        structuredLogger.info('FULL SYNC COMPLETED', {
            event: 'FULL_SYNC_COMPLETED',
            requestId,
            syncBatchId: batchId,
            status: 'SUCCESS',
            durationMs,
            resourceCount: summary.resource.processed,
            projectCount: summary.project.processed,
            allocationCount: summary.allocation.processed,
        });

        structuredLogger.info('FULL SYNC SUCCESS', {
            requestId,
            syncBatchId: batchId,
            durationMs,
            resource: summary.resource.processed,
            project: summary.project.processed,
            allocation: summary.allocation.processed,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const runs = await SyncRun.find({ syncBatchId: batchId }).lean();
        const runErrors = runs
            .filter((r) => r.status === 'FAILED' && (r.errorMessage || r.errorMessages?.length))
            .map((r) => `${r.sheet}: ${r.errorMessage ?? r.errorMessages?.[0]}`);
        const failureMessages =
            runErrors.length > 0 ? [message, ...runErrors] : [message];

        await SyncBatch.updateOne(
            { batchId },
            {
                $set: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    failureMessages,
                },
            }
        );
        structuredLogger.error('FULL SYNC FAILED', {
            requestId,
            syncBatchId: batchId,
            error: message,
            sheetErrors: runErrors,
        });
    } finally {
        await syncLockService.release(FULL_SYNC_LOCK, requestId);
    }
}

/**
 * Fire-and-forget Apps Script kickoff — do NOT block the batch job on GAS runtime.
 * Sheet imports run via webhooks; the background job polls SyncRun completion.
 */
function kickoffAppsScriptFullSync(requestId: string, batchId: string): void {
    const url = env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;
    if (!url) {
        structuredLogger.error('GOOGLE_APPS_SCRIPT_WEB_APP_URL not configured', {
            requestId,
            syncBatchId: batchId,
        });
        return;
    }

    structuredLogger.info('KICKOFF APPS SCRIPT FULL SYNC', { requestId, syncBatchId: batchId });

    void (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_KICKOFF_TIMEOUT_MS);
        try {
            const { response, text } = await postJsonToAppsScriptWebApp(
                url,
                { batchId, syncBatchId: batchId },
                {
                    headers: {
                        'X-Request-Id': requestId,
                        'X-Sync-Batch-Id': batchId,
                    },
                    signal: controller.signal,
                }
            );
            structuredLogger.info('APPS SCRIPT KICKOFF RESPONSE', {
                requestId,
                syncBatchId: batchId,
                httpStatus: response.status,
                bodyPreview: text.slice(0, 300),
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            structuredLogger.warn('APPS SCRIPT KICKOFF FAILED (webhooks may still arrive)', {
                requestId,
                syncBatchId: batchId,
                error: message,
            });
        } finally {
            clearTimeout(timeout);
        }
    })();
}

async function buildBatchSummary(batchId: string): Promise<FullSyncSummary> {
    const runs = await SyncRun.find({ syncBatchId: batchId }).lean();
    const runBySheet = new Map(runs.map((r) => [r.sheet, r]));

    const build = (sheet: SupportedSheet): SheetSyncSummary => {
        const run = runBySheet.get(sheet);
        if (!run) {
            return {
                received: 0,
                processed: 0,
                skipped: 0,
                upserted: 0,
                errors: [
                    'No SyncRun for this batch and sheet — webhook may have omitted syncBatchId or not completed',
                ],
                status: 'MISSING',
                lastSyncAt: null,
            };
        }

        const errors: string[] = [];
        if (run.errorMessage) errors.push(run.errorMessage);
        for (const msg of run.errorMessages ?? []) {
            if (msg && !errors.includes(msg)) errors.push(msg);
        }

        let status: SheetSyncSummary['status'];
        if (run.status === 'SUCCESS') status = 'SUCCESS';
        else if (run.status === 'RUNNING') status = 'RUNNING';
        else if (run.status === 'FAILED') status = 'FAILED';
        else status = 'PENDING';

        return {
            received: run.rowsReceived ?? 0,
            processed: run.rowsProcessed ?? 0,
            skipped: run.rowsSkipped ?? 0,
            upserted: run.rowsProcessed ?? 0,
            errors,
            status,
            lastSyncAt: run.completedAt?.toISOString() ?? run.startedAt?.toISOString() ?? null,
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
