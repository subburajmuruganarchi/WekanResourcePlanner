import { Document, Schema, Types, model } from 'mongoose';
import { WeeklyUtilizationSnapshotType } from '../../common/types/enums';

/**
 * Immutable weekly utilization snapshot for historical reporting.
 * Written after each successful actuals sync (when snapshots feature flag is on).
 */
export interface IWeeklyUtilizationSnapshot extends Document {
    employee_id: Types.ObjectId;
    project_id: Types.ObjectId;
    week_start: Date;
    snapshot_type: WeeklyUtilizationSnapshotType;
    hours: number;
    sync_batch_id: string;
    created_at?: Date;
}

const WeeklyUtilizationSnapshotSchema = new Schema<IWeeklyUtilizationSnapshot>(
    {
        employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
        project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        week_start: { type: Date, required: true, index: true },
        snapshot_type: {
            type: String,
            enum: Object.values(WeeklyUtilizationSnapshotType),
            required: true,
            index: true,
        },
        hours: { type: Number, required: true, default: 0 },
        sync_batch_id: { type: String, required: true, index: true },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        collection: 'weekly_utilization_snapshots',
    }
);

WeeklyUtilizationSnapshotSchema.index(
    { employee_id: 1, project_id: 1, week_start: 1, snapshot_type: 1, sync_batch_id: 1 },
    { unique: true }
);

WeeklyUtilizationSnapshotSchema.index({ week_start: 1, snapshot_type: 1 });

export const WeeklyUtilizationSnapshot = model<IWeeklyUtilizationSnapshot>(
    'WeeklyUtilizationSnapshot',
    WeeklyUtilizationSnapshotSchema
);
