import { Document, Schema, model } from 'mongoose';

export type SyncRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface ISyncRun extends Document {
    sheet: string;
    startedAt: Date;
    completedAt?: Date;
    rowsReceived: number;
    rowsProcessed: number;
    rowsSkipped: number;
    /** Primary failure message for operators. */
    errorMessage?: string | null;
    errorStack?: string | null;
    errorMessages: string[];
    skippedRows?: { identifier: string; reason: string }[];
    status: SyncRunStatus;
    syncId?: string;
    syncBatchId?: string;
}

const SyncRunSchema = new Schema<ISyncRun>(
    {
        sheet: { type: String, required: true, index: true },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date },
        rowsReceived: { type: Number, default: 0 },
        rowsProcessed: { type: Number, default: 0 },
        rowsSkipped: { type: Number, default: 0 },
        errorMessage: { type: String, default: null },
        errorStack: { type: String, default: null },
        errorMessages: { type: [String], default: [] },
        skippedRows: [
            {
                identifier: String,
                reason: String,
            },
        ],
        status: { type: String, enum: ['RUNNING', 'SUCCESS', 'FAILED'], required: true },
        syncId: { type: String, index: true },
        syncBatchId: { type: String, index: true, sparse: true },
    },
    {
        timestamps: false,
        collection: 'sync_runs',
    }
);

SyncRunSchema.index({ sheet: 1, startedAt: -1 });
SyncRunSchema.index(
    { syncBatchId: 1, sheet: 1 },
    {
        unique: true,
        partialFilterExpression: { syncBatchId: { $exists: true, $type: 'string' } },
    }
);

export const SyncRun = model<ISyncRun>('SyncRun', SyncRunSchema);
