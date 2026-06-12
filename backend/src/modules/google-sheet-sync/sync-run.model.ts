import { Document, Schema, model } from 'mongoose';

export type SyncRunStatus = 'SUCCESS' | 'FAILED';

export interface ISyncRun extends Document {
    sheet: string;
    startedAt: Date;
    completedAt?: Date;
    rowsReceived: number;
    rowsProcessed: number;
    rowsSkipped: number;
    errorMessages: string[];
    skippedRows?: { identifier: string; reason: string }[];
    status: SyncRunStatus;
    syncId?: string;
}

const SyncRunSchema = new Schema<ISyncRun>(
    {
        sheet: { type: String, required: true, index: true },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date },
        rowsReceived: { type: Number, default: 0 },
        rowsProcessed: { type: Number, default: 0 },
        rowsSkipped: { type: Number, default: 0 },
        errorMessages: { type: [String], default: [] },
        skippedRows: [
            {
                identifier: String,
                reason: String,
            },
        ],
        status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
        syncId: { type: String, index: true },
    },
    {
        timestamps: false,
        collection: 'sync_runs',
    }
);

SyncRunSchema.index({ sheet: 1, startedAt: -1 });

export const SyncRun = model<ISyncRun>('SyncRun', SyncRunSchema);
