import { Document, Schema, Types, model } from 'mongoose';
import { SkillType, SkillLevel, EmployeeStatus } from '../../common/types/enums';

export interface IEmployeeSkill {
    skillId: Types.ObjectId;
    skillType: SkillType;
    level: SkillLevel;
    experienceYears?: number;
}

export interface IEmployee extends Document {
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    status: EmployeeStatus;
    roleId: Types.ObjectId;
    department?: string;
    designation?: string;
    skills: IEmployeeSkill[];
    maxAllocationPercent: number;
    joiningDate?: Date;
    exitDate?: Date;
    isActive: boolean; // Computed or legacy, keeping for compatibility
}

const EmployeeSkillSchema = new Schema<IEmployeeSkill>({
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    skillType: { type: String, enum: Object.values(SkillType), required: true },
    level: { type: String, enum: Object.values(SkillLevel), required: true },
    experienceYears: { type: Number, default: 0 }
}, { _id: false });

const EmployeeSchema = new Schema<IEmployee>({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    employeeCode: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    status: { type: String, enum: Object.values(EmployeeStatus), default: EmployeeStatus.ACTIVE, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    skills: { type: [EmployeeSkillSchema], required: true },
    maxAllocationPercent: { type: Number, default: 100, min: 1, max: 100 },
    joiningDate: { type: Date },
    exitDate: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Authoritative Validation: At least one Primary skill
EmployeeSchema.path('skills').validate(function (skills: IEmployeeSkill[]) {
    if (!skills || skills.length === 0) return false;
    return skills.some(s => s.skillType === SkillType.PRIMARY);
}, 'Employee must have at least one Primary skill.');

// Ensure no duplicate skillIds in the same employee
EmployeeSchema.pre('validate', function (next) {
    if (this.skills && this.skills.length > 0) {
        const skillIds = this.skills.map(s => s.skillId.toString());
        const uniqueSkillIds = new Set(skillIds);
        if (skillIds.length !== uniqueSkillIds.size) {
            this.invalidate('skills', 'Duplicate skills are not allowed.');
        }
    }
    next();
});

export const Employee = model<IEmployee>('Employee', EmployeeSchema);
