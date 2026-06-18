import type { ISyncBatchSheetState } from './sync-batch.model';
import type { SupportedSheet } from './sync-batch-coordinator';

export type BatchSheetStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

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
