import { Document, Schema, Types, model } from 'mongoose';
import { ProjectStatus, ProjectPriority, BillingType, DeliveryModel, StaffingStrategy } from '../../common/types/enums';

// Note: Skill requirements and role efforts are now in separate collections
// This matches the resource-360 database structure

export interface IProject extends Document {
    project_name: string;
    project_code: string;
    project_owner_id: Types.ObjectId;
    project_manager_id: Types.ObjectId;
    status: ProjectStatus;
    priority: ProjectPriority;
    start_date: Date;
    end_date: Date;
    billing_type?: BillingType;
    delivery_model?: DeliveryModel;
    projected_total_hours?: number;
    project_logo?: string;
    // MCP Explainability Fields
    business_goal?: string;
    staffing_strategy?: StaffingStrategy;
    created_at?: Date;
    updated_at?: Date;
}

const ProjectSchema = new Schema<IProject>({
    project_name: { type: String, required: true, trim: true },
    project_code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    project_owner_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    project_manager_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.ACTIVE, index: true },
    priority: { type: String, enum: Object.values(ProjectPriority), required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    billing_type: { type: String, enum: Object.values(BillingType) },
    delivery_model: { type: String, enum: Object.values(DeliveryModel) },
    projected_total_hours: { type: Number },
    project_logo: { type: String, trim: true },
    // MCP Explainability Fields
    business_goal: { type: String, trim: true },
    staffing_strategy: { type: String, enum: Object.values(StaffingStrategy) }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'projects'
});

export const Project = model<IProject>('Project', ProjectSchema);
