import { Document, Schema, model } from 'mongoose';
import { FullSyncSummary } from '../../services/planner-import/types/import-result.types';

export type SyncBatchStatus = 'STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface ISyncBatchSheetState {
    sheet: string;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    rowsReceived?: number;
    rowsProcessed?: number;
    errors?: string[];
}

export interface ISyncBatch extends Document {
    batchId: string;
    status: SyncBatchStatus;
    startedAt: Date;
    completedAt?: Date;
    triggeredBy: 'UI' | 'SYSTEM';
    requestId: string;
    currentSheet?: string;
    progress: number;
    resourceCompleted: boolean;
    projectCompleted: boolean;
    allocationCompleted: boolean;
    sheets: ISyncBatchSheetState[];
    summary?: FullSyncSummary;
    failureMessages: string[];
}

const SyncBatchSchema = new Schema<ISyncBatch>(
    {
        batchId: { type: String, required: true, unique: true, index: true },
        status: {
            type: String,
            enum: ['STARTED', 'RUNNING', 'SUCCESS', 'FAILED'],
            required: true,
            index: true,
        },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date },
        triggeredBy: { type: String, enum: ['UI', 'SYSTEM'], default: 'UI' },
        requestId: { type: String, required: true, index: true },
        currentSheet: { type: String },
        progress: { type: Number, default: 0 },
        resourceCompleted: { type: Boolean, default: false },
        projectCompleted: { type: Boolean, default: false },
        allocationCompleted: { type: Boolean, default: false },
        sheets: [
            {
                sheet: String,
                status: { type: String, enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'] },
                rowsReceived: Number,
                rowsProcessed: Number,
                errors: [String],
            },
        ],
        summary: { type: Schema.Types.Mixed },
        failureMessages: { type: [String], default: [] },
    },
    { timestamps: false, collection: 'sync_batches' }
);

SyncBatchSchema.index({ startedAt: -1 });

export const SyncBatch = model<ISyncBatch>('SyncBatch', SyncBatchSchema);
