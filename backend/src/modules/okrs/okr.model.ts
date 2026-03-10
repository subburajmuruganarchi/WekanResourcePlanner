import { Document, Schema, model, Types } from 'mongoose';

export type OkrPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type OkrStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled';
export type KeyResultStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface IKeyResult {
    title: string;
    target: number;
    achieved: number;
    unit: string;
    status: KeyResultStatus;
}

export interface IOkr extends Document {
    employee_id: Types.ObjectId;
    objective: string;
    period: string;          // Structured: "Q1-2026", "Q2-2026", etc.
    period_quarter: OkrPeriod;
    period_year: number;
    status: OkrStatus;
    key_results: IKeyResult[];
    created_by: Types.ObjectId;
    created_at: Date;
    updated_at: Date;
}

const KeyResultSchema = new Schema<IKeyResult>({
    title: { type: String, required: true, trim: true },
    target: { type: Number, required: true },
    achieved: { type: Number, default: 0 },
    unit: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    }
}, { _id: true });

const OkrSchema = new Schema<IOkr>({
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    objective: { type: String, required: true, trim: true },
    period: { type: String, required: true, index: true },             // "Q1-2026"
    period_quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
    period_year: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Draft', 'Active', 'Completed', 'Cancelled'],
        default: 'Draft'
    },
    key_results: { type: [KeyResultSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'okrs'
});

// Compound index for fast employee + period lookups
OkrSchema.index({ employee_id: 1, period: 1 });

export const Okr = model<IOkr>('Okr', OkrSchema);
