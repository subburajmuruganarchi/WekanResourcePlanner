import { cascadeBatchSheetFailure } from './sync-batch-coordinator';
import { SyncBatch } from './sync-batch.model';
import { SyncRun } from './sync-run.model';

jest.mock('./sync-batch.model');
jest.mock('./sync-run.model');

describe('cascadeBatchSheetFailure', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (SyncBatch.updateOne as jest.Mock).mockResolvedValue({});
        (SyncRun.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    });

    it('marks Project and Allocation FAILED when Resource fails', async () => {
        await cascadeBatchSheetFailure('BATCH-1', 'Resource', 'Transaction aborted');

        expect(SyncBatch.updateOne).toHaveBeenCalledWith(
            { batchId: 'BATCH-1' },
            { $set: { status: 'FAILED' } }
        );

        const sheetUpdates = (SyncBatch.updateOne as jest.Mock).mock.calls.filter(
            (call) => call[0]?.['sheets.sheet']
        );
        expect(sheetUpdates).toHaveLength(2);
        expect(sheetUpdates[0][0]['sheets.sheet']).toBe('Project');
        expect(sheetUpdates[0][1].$set['sheets.$.errors']).toEqual([
            'Skipped because Resource import failed',
        ]);
        expect(sheetUpdates[1][0]['sheets.sheet']).toBe('Project_Allocation');
    });

    it('marks only Allocation FAILED when Project fails', async () => {
        await cascadeBatchSheetFailure('BATCH-2', 'Project', 'validation error');

        const sheetUpdates = (SyncBatch.updateOne as jest.Mock).mock.calls.filter(
            (call) => call[0]?.['sheets.sheet']
        );
        expect(sheetUpdates).toHaveLength(1);
        expect(sheetUpdates[0][0]['sheets.sheet']).toBe('Project_Allocation');
        expect(sheetUpdates[0][1].$set['sheets.$.errors']).toEqual([
            'Skipped because Project import failed',
        ]);
    });
});
