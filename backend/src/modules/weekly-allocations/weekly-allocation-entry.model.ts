import { Document, Schema, Types, model } from 'mongoose';
import { WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';

export interface IWeeklyAllocationEntry extends Document {
    /** Optional link to legacy project_allocations row (backward compatibility). */
    allocation_id?: Types.ObjectId;
    employee_id: Types.ObjectId;
    project_id: Types.ObjectId;
    /** UTC Monday 00:00:00.000 — canonical week grain. */
    week_start: Date;
    planned_hours: number;
    actual_hours: number;
    forecast_hours: number;
    /** planned_hours − actual_hours (positive = under-spent vs plan). */
    variance_hours: number;
    actuals_synced_at?: Date;
    source: WeeklyAllocationSource;
    status: WeeklyAllocationStatus;
    created_by?: Types.ObjectId;
    updated_by?: Types.ObjectId;
    created_at?: Date;
    updated_at?: Date;
}

const HOURS_MAX_PER_CELL = 168;

const WeeklyAllocationEntrySchema = new Schema<IWeeklyAllocationEntry>(
    {
        allocation_id: {
            type: Schema.Types.ObjectId,
            ref: 'ProjectAllocation',
            index: true,
            sparse: true,
        },
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        project_id: {
            type: Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },
        week_start: {
            type: Date,
            required: true,
            index: true,
        },
        planned_hours: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            max: HOURS_MAX_PER_CELL,
        },
        actual_hours: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            max: HOURS_MAX_PER_CELL,
        },
        forecast_hours: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            max: HOURS_MAX_PER_CELL,
        },
        variance_hours: {
            type: Number,
            required: true,
            default: 0,
        },
        actuals_synced_at: { type: Date, index: true },
        source: {
            type: String,
            enum: Object.values(WeeklyAllocationSource),
            required: true,
            default: WeeklyAllocationSource.PLANNED,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(WeeklyAllocationStatus),
            required: true,
            default: WeeklyAllocationStatus.DRAFT,
            index: true,
        },
        created_by: { type: Schema.Types.ObjectId, ref: 'Employee' },
        updated_by: { type: Schema.Types.ObjectId, ref: 'Employee' },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'weekly_allocation_entries',
    }
);

/** One cell per employee × project × week (idempotent grid upserts). */
WeeklyAllocationEntrySchema.index(
    { employee_id: 1, project_id: 1, week_start: 1 },
    { unique: true }
);

WeeklyAllocationEntrySchema.index({ employee_id: 1, week_start: 1 });
WeeklyAllocationEntrySchema.index({ project_id: 1, week_start: 1 });
WeeklyAllocationEntrySchema.index({ week_start: 1, status: 1 });
WeeklyAllocationEntrySchema.index({ allocation_id: 1, week_start: 1 }, { sparse: true });

WeeklyAllocationEntrySchema.pre('validate', function (next) {
    if (this.week_start) {
        const d = this.week_start;
        const day = d.getUTCDay();
        if (day !== 1) {
            next(new Error('week_start must be a UTC Monday (ISO week)'));
            return;
        }
        if (
            d.getUTCHours() !== 0 ||
            d.getUTCMinutes() !== 0 ||
            d.getUTCSeconds() !== 0 ||
            d.getUTCMilliseconds() !== 0
        ) {
            next(new Error('week_start must be normalized to UTC midnight'));
            return;
        }
    }
    next();
});

export const WeeklyAllocationEntry = model<IWeeklyAllocationEntry>(
    'WeeklyAllocationEntry',
    WeeklyAllocationEntrySchema
);

export const WEEKLY_HOURS_MAX_PER_CELL = HOURS_MAX_PER_CELL;
