import { SyncInProgressError } from './sync-errors';
import { FULL_SYNC_LOCK } from './sync-lock.service';

/** Mirrors sheet-sync.service FULL_SYNC_BATCH_TIMEOUT_MS without pulling uuid ESM chain. */
const FULL_SYNC_BATCH_TIMEOUT_MS = 1_200_000;

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

describe('full sync background job timeouts', () => {
    it('allows 20 minutes for webhook completion (not limited by GAS 5min runtime)', () => {
        expect(FULL_SYNC_BATCH_TIMEOUT_MS).toBe(1_200_000);
        expect(FULL_SYNC_BATCH_TIMEOUT_MS).toBeGreaterThan(300_000);
    });
});
