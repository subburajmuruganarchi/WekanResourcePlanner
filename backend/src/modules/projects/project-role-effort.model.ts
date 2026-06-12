import { Document, Schema, Types, model } from 'mongoose';

// Separate collection for project role efforts (matches resource-360 structure)
export interface IProjectRoleEffort extends Document {
    project_id: Types.ObjectId;
    role_id: Types.ObjectId;
    required_headcount: number;
    required_days?: number;
    start_date: Date;
    end_date: Date;
    hours_per_day: number;
}

const ProjectRoleEffortSchema = new Schema<IProjectRoleEffort>({
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    required_headcount: { type: Number, required: true, min: 1 },
    required_days: { type: Number, min: 1 },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    hours_per_day: { type: Number, required: true, min: 1 }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'project_role_efforts'
});

export const ProjectRoleEffort = model<IProjectRoleEffort>('ProjectRoleEffort', ProjectRoleEffortSchema);
