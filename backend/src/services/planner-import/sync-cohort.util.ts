import type { ImportContext } from './types/import-context.types';
import type { GoogleSheetWebhookBody } from './types/import-result.types';

/** Id stamped on `last_sync_id` so multi-chunk sheet uploads share one cohort. */
export function employeeSyncCohortId(
    ctx: Pick<ImportContext, 'sheetSyncSessionId' | 'syncBatchId' | 'syncId'>
): string | undefined {
    return ctx.sheetSyncSessionId ?? ctx.syncBatchId ?? ctx.syncId;
}

export interface SheetChunkMeta {
    batchIndex: number;
    totalBatches: number;
    isFinalChunk: boolean;
    isMultiChunk: boolean;
}

export function resolveSheetChunkMeta(
    body: Pick<GoogleSheetWebhookBody, 'batchIndex' | 'totalBatches'>
): SheetChunkMeta {
    const totalBatches = Math.max(1, typeof body.totalBatches === 'number' ? body.totalBatches : 1);
    const rawIndex = typeof body.batchIndex === 'number' ? body.batchIndex : 0;
    const batchIndex = Math.min(Math.max(0, rawIndex), totalBatches - 1);
    return {
        batchIndex,
        totalBatches,
        isFinalChunk: batchIndex >= totalBatches - 1,
        isMultiChunk: totalBatches > 1,
    };
}
