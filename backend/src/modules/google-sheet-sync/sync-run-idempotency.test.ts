import { AppError } from '../../common/errors/app-error';
import {
    acquireSyncRun,
    syncResponseFromRun,
} from './sync-run-idempotency';
import { SyncRun } from './sync-run.model';

jest.mock('./sync-run.model');
jest.mock('./sync-lock.service', () => ({
    FULL_SYNC_LOCK: 'FULL_SYNC',
    syncLockService: {
        getActiveLock: jest.fn(),
    },
}));

import { syncLockService } from './sync-lock.service';

describe('acquireSyncRun', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates a new run for manual sync without batchId', async () => {
        const mockRun = {
            _id: 'id1',
            sheet: 'Resource',
            status: 'RUNNING',
            rowsReceived: 10,
            rowsProcessed: 0,
            rowsSkipped: 0,
            errorMessages: [],
            syncId: 'sync-1',
            startedAt: new Date(),
        };
        (SyncRun.create as jest.Mock).mockResolvedValue(mockRun);

        const result = await acquireSyncRun({
            sheet: 'Resource',
            received: 10,
            syncId: 'sync-1',
        });

        expect(result.mode).toBe('new');
        expect(SyncRun.create).toHaveBeenCalledWith(
            expect.objectContaining({ sheet: 'Resource', status: 'RUNNING' })
        );
    });

    it('returns cached result when batch sheet already SUCCESS', async () => {
        const mockRun = {
            _id: 'id2',
            sheet: 'Project',
            status: 'SUCCESS',
            rowsReceived: 5,
            rowsProcessed: 5,
            rowsSkipped: 0,
            errorMessages: [],
            syncId: 'sync-2',
            startedAt: new Date(),
            completedAt: new Date(),
        };
        (SyncRun.findOne as jest.Mock).mockResolvedValue(mockRun);

        const result = await acquireSyncRun({
            syncBatchId: 'BATCH-1',
            sheet: 'Project',
            received: 5,
            syncId: 'sync-2',
        });

        expect(result.mode).toBe('cached');
        expect(result.run.status).toBe('SUCCESS');
    });

    it('rejects FAILED batch retry without retry:true when not active full sync', async () => {
        (syncLockService.getActiveLock as jest.Mock).mockResolvedValue(null);
        (SyncRun.findOne as jest.Mock).mockResolvedValue({
            status: 'FAILED',
            errorMessages: ['boom'],
        });

        await expect(
            acquireSyncRun({
                syncBatchId: 'BATCH-2',
                sheet: 'Resource',
                received: 1,
                syncId: 'sync-3',
            })
        ).rejects.toThrow(AppError);
    });

    it('allows FAILED retry during active full sync batch', async () => {
        (syncLockService.getActiveLock as jest.Mock).mockResolvedValue({
            batchId: 'BATCH-3',
        });
        (SyncRun.findOne as jest.Mock).mockResolvedValue({
            status: 'FAILED',
            errorMessages: ['boom'],
        });
        (SyncRun.findOneAndUpdate as jest.Mock).mockResolvedValue({
            _id: 'id4',
            sheet: 'Resource',
            status: 'RUNNING',
            syncBatchId: 'BATCH-3',
        });

        const result = await acquireSyncRun({
            syncBatchId: 'BATCH-3',
            sheet: 'Resource',
            received: 1,
            syncId: 'sync-5',
        });

        expect(result.mode).toBe('new');
        expect(SyncRun.findOneAndUpdate).toHaveBeenCalled();
    });

    it('builds idempotent response from successful run', () => {
        const run = {
            _id: 'id3',
            sheet: 'Resource',
            status: 'SUCCESS',
            rowsReceived: 100,
            rowsProcessed: 100,
            rowsSkipped: 0,
            errorMessages: [],
            syncId: 'sync-4',
            startedAt: new Date('2026-01-01T00:00:00Z'),
            completedAt: new Date('2026-01-01T00:01:00Z'),
        };

        const response = syncResponseFromRun(run as never, 'REQ-1');
        expect(response.success).toBe(true);
        expect(response.rowsProcessed).toBe(100);
        expect(response.durationMs).toBe(60_000);
    });
});

describe('SyncInProgressError contract', () => {
    it('carries active syncBatchId for 409 responses', async () => {
        const { SyncInProgressError } = await import('./sync-errors');
        const err = new SyncInProgressError('busy', 'FULLSYNC-123');
        expect(err.statusCode).toBe(409);
        expect(err.activeSyncBatchId).toBe('FULLSYNC-123');
    });
});
