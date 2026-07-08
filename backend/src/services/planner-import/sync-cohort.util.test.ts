import { employeeSyncCohortId, resolveSheetChunkMeta } from './sync-cohort.util';

describe('sync-cohort.util', () => {
    describe('resolveSheetChunkMeta', () => {
        it('defaults to single chunk', () => {
            expect(resolveSheetChunkMeta({})).toEqual({
                batchIndex: 0,
                totalBatches: 1,
                isFinalChunk: true,
                isMultiChunk: false,
            });
        });

        it('marks non-final chunks for stale cleanup deferral', () => {
            expect(resolveSheetChunkMeta({ batchIndex: 0, totalBatches: 2 })).toEqual({
                batchIndex: 0,
                totalBatches: 2,
                isFinalChunk: false,
                isMultiChunk: true,
            });
            expect(resolveSheetChunkMeta({ batchIndex: 1, totalBatches: 2 })).toEqual({
                batchIndex: 1,
                totalBatches: 2,
                isFinalChunk: true,
                isMultiChunk: true,
            });
        });
    });

    describe('employeeSyncCohortId', () => {
        it('prefers sheetSyncSessionId over syncBatchId and syncId', () => {
            expect(
                employeeSyncCohortId({
                    sheetSyncSessionId: 'session-1',
                    syncBatchId: 'batch-1',
                    syncId: 'sync-1',
                })
            ).toBe('session-1');
        });

        it('falls back to syncBatchId then syncId', () => {
            expect(employeeSyncCohortId({ syncBatchId: 'batch-1', syncId: 'sync-1' })).toBe(
                'batch-1'
            );
            expect(employeeSyncCohortId({ syncId: 'sync-1' })).toBe('sync-1');
        });
    });
});
