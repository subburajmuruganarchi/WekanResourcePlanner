import { SyncLock } from './sync-lock.model';

export const FULL_SYNC_LOCK = 'FULL_SYNC';
const LOCK_TTL_MS = 15 * 60 * 1000;

export interface ActiveSyncLock {
    requestId: string;
    batchId?: string;
    expiresAt: Date;
}

export const syncLockService = {
    async tryAcquire(name: string, requestId: string, batchId?: string): Promise<boolean> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

        try {
            const doc = await SyncLock.findOneAndUpdate(
                {
                    name,
                    $or: [{ expiresAt: { $lt: now } }, { running: false }, { expiresAt: null }],
                },
                {
                    $set: {
                        running: true,
                        startedAt: now,
                        expiresAt,
                        requestId,
                        batchId: batchId ?? null,
                    },
                },
                { upsert: true, new: true }
            );
            return doc?.requestId === requestId;
        } catch (err: unknown) {
            const code = (err as { code?: number })?.code;
            if (code === 11000) return false;
            throw err;
        }
    },

    async release(name: string, requestId: string): Promise<void> {
        await SyncLock.updateOne(
            { name, requestId },
            {
                $set: {
                    running: false,
                    batchId: null,
                    expiresAt: new Date(),
                },
            }
        );
    },

    async getActiveLock(name: string): Promise<ActiveSyncLock | null> {
        const now = new Date();
        const doc = await SyncLock.findOne({ name }).lean();
        if (!doc?.running || !doc.expiresAt || doc.expiresAt <= now) {
            return null;
        }
        if (!doc.requestId) return null;
        return {
            requestId: doc.requestId,
            batchId: doc.batchId ?? undefined,
            expiresAt: doc.expiresAt,
        };
    },

    async isRunning(name: string): Promise<boolean> {
        return (await this.getActiveLock(name)) !== null;
    },
};
