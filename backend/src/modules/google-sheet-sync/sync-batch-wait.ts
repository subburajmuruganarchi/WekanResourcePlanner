import { AppError } from '../../common/errors/app-error';
import { structuredLogger } from '../../common/logger';
import { SyncRun } from './sync-run.model';
import type { SupportedSheet } from './sync-batch-coordinator';

const BATCH_COMPLETION_POLL_MS = 2_000;
const DEFAULT_BATCH_COMPLETION_TIMEOUT_MS = 1_200_000;

const SHEET_ORDER: SupportedSheet[] = ['Resource', 'Project', 'Project_Allocation'];

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBatchRunDetail(
    runs: Array<{ sheet: string; status?: string; errorMessage?: string | null }>
): string {
    return SHEET_ORDER.map((sheet) => {
        const run = runs.find((r) => r.sheet === sheet);
        if (!run) return `${sheet}:MISSING`;
        const err = run.errorMessage ? ` (${run.errorMessage})` : '';
        return `${sheet}:${run.status ?? 'UNKNOWN'}${err}`;
    }).join(', ');
}

/**
 * After Apps Script returns, wait until all three sheet webhooks have
 * reached a terminal SyncRun state for this batch.
 */
export async function waitForBatchSheetRuns(
    batchId: string,
    requestId: string,
    timeoutMs: number = DEFAULT_BATCH_COMPLETION_TIMEOUT_MS
): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const runs = await SyncRun.find({ syncBatchId: batchId }).lean();
        const bySheet = new Map(runs.map((r) => [r.sheet, r]));

        const allTerminal = SHEET_ORDER.every((sheet) => {
            const status = bySheet.get(sheet)?.status;
            return status === 'SUCCESS' || status === 'FAILED';
        });

        if (runs.length >= SHEET_ORDER.length && allTerminal) {
            structuredLogger.info('BATCH WEBHOOKS COMPLETE', {
                requestId,
                syncBatchId: batchId,
                detail: formatBatchRunDetail(runs),
            });
            return;
        }

        structuredLogger.info('WAITING FOR BATCH WEBHOOKS', {
            requestId,
            syncBatchId: batchId,
            runsFound: runs.length,
            detail: formatBatchRunDetail(runs),
        });

        await sleep(BATCH_COMPLETION_POLL_MS);
    }

    const runs = await SyncRun.find({ syncBatchId: batchId }).lean();
    throw new AppError(
        `Timed out waiting for batch webhooks: ${formatBatchRunDetail(runs)}`,
        504
    );
}
