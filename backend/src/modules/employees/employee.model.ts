import { Document, Schema, Types, model } from 'mongoose';
import { SkillType, SkillLevel } from '../../common/types/enums';

export interface IEmployeeSkill {
    skillId: Types.ObjectId;
    type: SkillType;
    level: SkillLevel;
}

export interface IEmployee extends Document {
    firstName: string;
    lastName: string;
    email: string;
    title: string;
    roles: Types.ObjectId[];
    skills: IEmployeeSkill[];
    resourceId: string;
    isActive: boolean;
    experienceYears: number;
}

const EmployeeSkillSchema = new Schema<IEmployeeSkill>({
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    type: { type: String, enum: Object.values(SkillType), required: true },
    level: { type: String, enum: Object.values(SkillLevel), required: true }
}, { _id: false });

const EmployeeSchema = new Schema<IEmployee>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    skills: { type: [EmployeeSkillSchema], default: [] },
    resourceId: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    experienceYears: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure at least one primary skill exists (Schema Validation)
EmployeeSchema.path('skills').validate(function (skills: IEmployeeSkill[]) {
    if (!skills) return false;
    return skills.some(s => s.type === SkillType.PRIMARY);
}, 'Employee must have at least one Primary skill.');

export const Employee = model<IEmployee>('Employee', EmployeeSchema);
