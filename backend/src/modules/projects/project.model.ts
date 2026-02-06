import { Document, Schema, Types, model } from 'mongoose';
import { ProjectStatus, SkillLevel } from '../../common/types/enums';

export interface IProject extends Document {
    code: string;
    name: string;
    clientName: string;
    startDate: Date;
    endDate?: Date;
    status: ProjectStatus;
    managerId?: Types.ObjectId;
}

export interface IProjectSkillRequirement extends Document {
    projectId: Types.ObjectId;
    skillId: Types.ObjectId;
    level: SkillLevel;
    requiredCount: number;
    startDate: Date;
    endDate: Date;
}

export interface IProjectRoleEffort extends Document {
    projectId: Types.ObjectId;
    roleId: Types.ObjectId;
    estimatedHours: number;
}

const ProjectSchema = new Schema<IProject>({
    code: { type: String, required: true, unique: true, immutable: true, index: true },
    name: { type: String, required: true },
    clientName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.PLANNING, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

// Pre-save to auto-generate code if missing (Basic)
ProjectSchema.pre('save', function (next) {
    if (!this.code) {
        this.code = 'PRJ-' + Date.now().toString(36).toUpperCase();
    }
    next();
});

const ProjectSkillRequirementSchema = new Schema<IProjectSkillRequirement>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    level: { type: String, enum: Object.values(SkillLevel), required: true },
    requiredCount: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
});

const ProjectRoleEffortSchema = new Schema<IProjectRoleEffort>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    estimatedHours: { type: Number, required: true }
});

export const Project = model<IProject>('Project', ProjectSchema);
export const ProjectSkillRequirement = model<IProjectSkillRequirement>('ProjectSkillRequirement', ProjectSkillRequirementSchema);
export const ProjectRoleEffort = model<IProjectRoleEffort>('ProjectRoleEffort', ProjectRoleEffortSchema);
