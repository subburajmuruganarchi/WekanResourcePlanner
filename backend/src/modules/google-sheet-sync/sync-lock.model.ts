import { Document, Schema, model } from 'mongoose';

export interface ISyncLock extends Document {
    name: string;
    running: boolean;
    startedAt?: Date;
    expiresAt?: Date;
    requestId?: string;
    batchId?: string;
}

const SyncLockSchema = new Schema<ISyncLock>(
    {
        name: { type: String, required: true, unique: true, index: true },
        running: { type: Boolean, default: false },
        startedAt: { type: Date },
        expiresAt: { type: Date, index: true },
        requestId: { type: String },
        batchId: { type: String, index: true, sparse: true },
    },
    { timestamps: false, collection: 'sync_locks' }
);

export const SyncLock = model<ISyncLock>('SyncLock', SyncLockSchema);
