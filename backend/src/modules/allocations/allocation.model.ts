import { Document, Schema, Types, model } from 'mongoose';
import { AllocationType, CreatedByRole } from '../../common/types/enums';

// Matches resource-360 database structure (project_allocations collection)
export interface IProjectAllocation extends Document {
    project_id: Types.ObjectId;
    employee_id: Types.ObjectId;
    role_id: Types.ObjectId;
    skill_id?: Types.ObjectId;
    start_date: Date;
    end_date: Date;
    allocation_percent: number;
    type?: AllocationType;
    is_active: boolean;
    // MCP Explainability Fields
    allocation_reason?: string;
    created_by_role?: CreatedByRole;
}

const ProjectAllocationSchema = new Schema<IProjectAllocation>({
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    skill_id: { type: Schema.Types.ObjectId, ref: 'Skill' },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    allocation_percent: { type: Number, required: true, min: 0, max: 100 },
    type: { type: String, enum: Object.values(AllocationType), default: AllocationType.PERCENTAGE },
    is_active: { type: Boolean, default: true },
    // MCP Explainability Fields
    allocation_reason: { type: String, trim: true },
    created_by_role: { type: String, enum: Object.values(CreatedByRole) }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'project_allocations'
});

// Compound Indexes for availability checking
ProjectAllocationSchema.index({ employee_id: 1, start_date: 1, end_date: 1 });
ProjectAllocationSchema.index({ project_id: 1, employee_id: 1 });

export interface IAllocationOverrideLog extends Document {
    allocation_id?: Types.ObjectId;
    project_id: Types.ObjectId;
    employee_id: Types.ObjectId;
    requested_percentage: number;
    reason: string;
    authorized_by: Types.ObjectId;
}

const AllocationOverrideLogSchema = new Schema<IAllocationOverrideLog>({
    allocation_id: { type: Schema.Types.ObjectId, ref: 'ProjectAllocation' },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    requested_percentage: { type: Number, required: true },
    reason: { type: String, required: true },
    authorized_by: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'allocation_override_logs'
});

export const ProjectAllocation = model<IProjectAllocation>('ProjectAllocation', ProjectAllocationSchema);
export const AllocationOverrideLog = model<IAllocationOverrideLog>('AllocationOverrideLog', AllocationOverrideLogSchema);
