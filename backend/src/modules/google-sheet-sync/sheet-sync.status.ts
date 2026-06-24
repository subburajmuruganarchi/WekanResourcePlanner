import type { ISyncBatchSheetState } from './sync-batch.model';
import type { SupportedSheet } from './sync-batch-coordinator';
import type { SheetSyncProgress } from '../../services/planner-import/types/import-result.types';
import type { ISyncRun } from './sync-run.model';

export type BatchSheetStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

type SyncRunCounts = Pick<ISyncRun, 'rowsProcessed' | 'rowsSkipped'>;

export function buildBatchSheetStatus(
    sheets: ISyncBatchSheetState[] | undefined
): Record<SupportedSheet, BatchSheetStatus> {
    const state = (name: SupportedSheet): BatchSheetStatus => {
        const entry = sheets?.find((s) => s.sheet === name);
        return (entry?.status as BatchSheetStatus) ?? 'PENDING';
    };

    return {
        Resource: state('Resource'),
        Project: state('Project'),
        Project_Allocation: state('Project_Allocation'),
    };
}

export function buildSheetSyncProgress(
    sheet: SupportedSheet,
    state: BatchSheetStatus,
    run: SyncRunCounts | undefined,
    batchSheets: ISyncBatchSheetState[] | undefined
): SheetSyncProgress {
    const batchEntry = batchSheets?.find((s) => s.sheet === sheet);
    return {
        processed: run?.rowsProcessed ?? batchEntry?.rowsProcessed ?? 0,
        skipped: run?.rowsSkipped ?? 0,
        state,
    };
}
