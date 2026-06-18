import { SyncInProgressError } from './sync-errors';
import { FULL_SYNC_LOCK } from './sync-lock.service';

describe('SyncInProgressError', () => {
    it('exposes active syncBatchId for HTTP 409 responses (test 7)', () => {
        const err = new SyncInProgressError('Sync already running', 'FULLSYNC-XYZ');
        expect(err.statusCode).toBe(409);
        expect(err.activeSyncBatchId).toBe('FULLSYNC-XYZ');
    });
});

describe('FULL_SYNC_LOCK constant', () => {
    it('uses MongoDB distributed lock key FULL_SYNC', () => {
        expect(FULL_SYNC_LOCK).toBe('FULL_SYNC');
    });
});
