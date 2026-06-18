import { AppError } from '../../common/errors/app-error';
import { GoogleSheetSyncResponse } from '../../services/planner-import/types/import-result.types';
import { SyncRun, ISyncRun, SyncRunStatus } from './sync-run.model';

const RUN_WAIT_POLL_MS = 1_000;
const RUN_WAIT_TIMEOUT_MS = 300_000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SyncRunAcquireMode = 'new' | 'cached' | 'waited';

export interface SyncRunAcquireResult {
    run: ISyncRun;
    mode: SyncRunAcquireMode;
}

export function syncResponseFromRun(run: ISyncRun, requestId: string): GoogleSheetSyncResponse {
    return {
        success: run.status === 'SUCCESS',
        sheet: run.sheet,
        rowsReceived: run.rowsReceived,
        rowsProcessed: run.rowsProcessed,
        rowsSkipped: run.rowsSkipped,
        errors: run.errorMessages ?? [],
        skippedRows: run.skippedRows,
        syncRunId: run._id.toString(),
        syncId: run.syncId,
        requestId,
        durationMs:
            run.completedAt && run.startedAt
                ? run.completedAt.getTime() - run.startedAt.getTime()
                : undefined,
    };
}

async function waitForSyncRun(
    syncBatchId: string,
    sheet: string
): Promise<ISyncRun> {
    const deadline = Date.now() + RUN_WAIT_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const run = await SyncRun.findOne({ syncBatchId, sheet }).lean();
        if (!run) {
            await sleep(RUN_WAIT_POLL_MS);
            continue;
        }
        if (run.status === 'SUCCESS' || run.status === 'FAILED') {
            return run as unknown as ISyncRun;
        }
        await sleep(RUN_WAIT_POLL_MS);
    }

    throw new AppError(
        `Timed out waiting for in-progress sync of ${sheet} in batch ${syncBatchId}`,
        504
    );
}

/**
 * Idempotent sync-run acquisition for batched webhooks.
 * Manual sync (no syncBatchId) always creates a new run.
 */
export async function acquireSyncRun(params: {
    syncBatchId?: string;
    sheet: string;
    received: number;
    syncId: string;
    allowRetry?: boolean;
}): Promise<SyncRunAcquireResult> {
    if (!params.syncBatchId) {
        const run = await SyncRun.create({
            sheet: params.sheet,
            startedAt: new Date(),
            rowsReceived: params.received,
            rowsProcessed: 0,
            rowsSkipped: 0,
            errorMessages: [],
            status: 'RUNNING',
            syncId: params.syncId,
        });
        return { run, mode: 'new' };
    }

    const { syncBatchId, sheet, received, syncId, allowRetry } = params;
    let existing = await SyncRun.findOne({ syncBatchId, sheet });

    if (existing?.status === 'SUCCESS') {
        return { run: existing, mode: 'cached' };
    }

    if (existing?.status === 'RUNNING') {
        const completed = await waitForSyncRun(syncBatchId, sheet);
        return { run: completed, mode: 'waited' };
    }

    if (existing?.status === 'FAILED' && !allowRetry) {
        throw new AppError(
            `${sheet} import already failed for batch ${syncBatchId}. ` +
                'Resend with retry:true to retry.',
            409
        );
    }

    try {
        const run = await SyncRun.findOneAndUpdate(
            { syncBatchId, sheet },
            {
                $set: {
                    status: 'RUNNING' as SyncRunStatus,
                    startedAt: new Date(),
                    completedAt: undefined,
                    rowsReceived: received,
                    rowsProcessed: 0,
                    rowsSkipped: 0,
                    errorMessages: [],
                    skippedRows: [],
                    syncId,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (!run) {
            throw new AppError(`Failed to acquire sync run for ${sheet}`, 500);
        }
        return { run, mode: existing ? 'new' : 'new' };
    } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code === 11000) {
            existing = await SyncRun.findOne({ syncBatchId, sheet });
            if (existing?.status === 'SUCCESS') {
                return { run: existing, mode: 'cached' };
            }
            if (existing?.status === 'RUNNING') {
                const completed = await waitForSyncRun(syncBatchId, sheet);
                return { run: completed, mode: 'waited' };
            }
        }
        throw err;
    }
}
