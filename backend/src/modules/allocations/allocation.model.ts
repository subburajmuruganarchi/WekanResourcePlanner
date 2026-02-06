import { Document, Schema, Types, model } from 'mongoose';
import { AllocationType } from '../../common/types/enums';

export interface IProjectAllocation extends Document {
    projectId: Types.ObjectId;
    employeeId: Types.ObjectId;
    roleId: Types.ObjectId;
    startDate: Date;
    endDate: Date;
    percentage: number;
    type: AllocationType;
    isActive: boolean;
}

export interface IAllocationOverrideLog extends Document {
    allocationId?: Types.ObjectId; // Only if it resulted in a creation
    projectId: Types.ObjectId;
    employeeId: Types.ObjectId;
    requestedPercentage: number;
    reason: string;
    authorizedBy: Types.ObjectId;
    createdAt: Date;
}

const ProjectAllocationSchema = new Schema<IProjectAllocation>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    type: { type: String, enum: Object.values(AllocationType), default: AllocationType.PERCENTAGE },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound Indexes for availability checking
ProjectAllocationSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
ProjectAllocationSchema.index({ projectId: 1, employeeId: 1 });

const AllocationOverrideLogSchema = new Schema<IAllocationOverrideLog>({
    allocationId: { type: Schema.Types.ObjectId, ref: 'ProjectAllocation' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    requestedPercentage: { type: Number, required: true },
    reason: { type: String, required: true },
    authorizedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const ProjectAllocation = model<IProjectAllocation>('ProjectAllocation', ProjectAllocationSchema);
export const AllocationOverrideLog = model<IAllocationOverrideLog>('AllocationOverrideLog', AllocationOverrideLogSchema);
