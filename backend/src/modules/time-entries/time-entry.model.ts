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
    // Approval audit fields
    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    // Rejection audit fields
    rejectedBy?: Types.ObjectId;
    rejectedAt?: Date;
    rejectionComment?: string;
    // Admin Override tracking
    overriddenBy?: Types.ObjectId;
    overriddenAt?: Date;
    overrideReason?: string;
    // Denormalized for performance
    projectManagerUserId: Types.ObjectId;
}

const TimeEntrySchema = new Schema<ITimeEntry>({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    timeCodeId: { type: Schema.Types.ObjectId, ref: 'TimeCode', required: true },
    date: { type: Date, required: true, index: true },
    hours: { type: Number, required: true, min: 0, max: 24 },
    comments: { type: String, maxlength: 500 },
    weekStartDate: { type: Date, required: true, index: true },
    status: { type: String, enum: Object.values(TimeEntryStatus), default: TimeEntryStatus.DRAFT, index: true },
    // Approval audit fields
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    approvedAt: { type: Date },
    // Rejection audit fields
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    rejectedAt: { type: Date },
    rejectionComment: { type: String, maxlength: 500 },
    // Admin Override fields
    overriddenBy: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    overriddenAt: { type: Date },
    overrideReason: { type: String, maxlength: 500 },
    // Denormalized for performance
    projectManagerUserId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }
}, { timestamps: true });

// Compound Indexes
TimeEntrySchema.index({ employeeId: 1, weekStartDate: 1 });
TimeEntrySchema.index({ projectId: 1, date: 1 });
TimeEntrySchema.index({ projectManagerUserId: 1, status: 1, weekStartDate: 1 });

// MCP Virtual: normalizedHours = hours / 8 (standard workday)
TimeEntrySchema.virtual('normalizedHours').get(function () {
    return this.hours ? Math.round((this.hours / 8) * 100) / 100 : 0;
});

TimeEntrySchema.set('toJSON', { virtuals: true });
TimeEntrySchema.set('toObject', { virtuals: true });

export const TimeEntry = model<ITimeEntry>('TimeEntry', TimeEntrySchema);
