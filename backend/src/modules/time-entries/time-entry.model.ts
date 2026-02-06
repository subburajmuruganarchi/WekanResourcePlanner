import { Document, Schema, Types, model } from 'mongoose';
import { TimeEntryStatus } from '../../common/types/enums';

export interface ITimeEntry extends Document {
    employeeId: Types.ObjectId;
    projectId: Types.ObjectId;
    timeCodeId: Types.ObjectId;
    date: Date;
    hours: number;
    comments?: string;
    weekStartDate: Date;
    status: TimeEntryStatus;
}

const TimeEntrySchema = new Schema<ITimeEntry>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    timeCodeId: { type: Schema.Types.ObjectId, ref: 'TimeCode', required: true },
    date: { type: Date, required: true, index: true }, // For Daily view
    hours: { type: Number, required: true, min: 0, max: 24 },
    comments: { type: String, maxlength: 500 },
    weekStartDate: { type: Date, required: true, index: true }, // For Weekly view aggregation
    status: { type: String, enum: Object.values(TimeEntryStatus), default: TimeEntryStatus.DRAFT, index: true }
}, { timestamps: true });

// Compound Indexes
// Ensure efficient query for "Show me John's timesheet for Week X"
TimeEntrySchema.index({ employeeId: 1, weekStartDate: 1 });
// Ensure efficient query for "Show me all hours for Project Y"
TimeEntrySchema.index({ projectId: 1, date: 1 });

export const TimeEntry = model<ITimeEntry>('TimeEntry', TimeEntrySchema);
