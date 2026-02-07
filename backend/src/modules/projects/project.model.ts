import { Document, Schema, Types, model } from 'mongoose';
import { ProjectStatus, ProjectPriority, SkillLevel, BillingType, DeliveryModel } from '../../common/types/enums';

export interface ISkillRequirement {
    skillId: Types.ObjectId;
    minSkillLevel: SkillLevel;
    requiredHeadcount: number;
    requiredDays: number;
    roleId?: Types.ObjectId;
}

export interface IRoleEffort {
    roleId: Types.ObjectId;
    requiredHeadcount: number;
    requiredDays: number;
    hoursPerDay: number;
}

export interface IProject extends Document {
    code: string;
    name: string;
    // clientName removed per authoritative spec
    status: ProjectStatus;
    priority: ProjectPriority;
    ownerId: Types.ObjectId; // Renamed from managerId to ownerId per spec
    startDate: Date;
    endDate: Date; // Now required
    billingType?: BillingType;
    deliveryModel?: DeliveryModel;
    skillRequirements: ISkillRequirement[];
    roleEfforts?: IRoleEffort[];
    createdAt: Date;
    updatedAt: Date;
}

const SkillRequirementSchema = new Schema<ISkillRequirement>({
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    minSkillLevel: { type: String, enum: Object.values(SkillLevel), required: true },
    requiredHeadcount: { type: Number, required: true, min: 1 },
    requiredDays: { type: Number, required: true, min: 1 },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role' }
});

const RoleEffortSchema = new Schema<IRoleEffort>({
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    requiredHeadcount: { type: Number, required: true, min: 1 },
    requiredDays: { type: Number, required: true, min: 1 },
    hoursPerDay: { type: Number, required: true, min: 1 }
});

const ProjectSchema = new Schema<IProject>({
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.ACTIVE, index: true },
    priority: { type: String, enum: Object.values(ProjectPriority), required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    billingType: { type: String, enum: Object.values(BillingType) },
    deliveryModel: { type: String, enum: Object.values(DeliveryModel) },
    skillRequirements: [SkillRequirementSchema],
    roleEfforts: [RoleEffortSchema]
}, { timestamps: true });

export const Project = model<IProject>('Project', ProjectSchema);
