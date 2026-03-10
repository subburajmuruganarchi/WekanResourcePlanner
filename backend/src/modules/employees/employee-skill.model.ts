import { Document, Schema, Types, model } from 'mongoose';
import { SkillLevel } from '../../common/types/enums';

// Separate collection for employee skills (matches resource-360 structure)
export interface IEmployeeSkill extends Document {
    employee_id: Types.ObjectId;
    skill_id: Types.ObjectId;
    skill_level: SkillLevel;
    experience_years?: number; // DB uses experience_years
    is_primary?: boolean;
}

const EmployeeSkillSchema = new Schema<IEmployeeSkill>({
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    skill_id: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    skill_level: { type: String, enum: Object.values(SkillLevel), required: true },
    experience_years: { type: Number, default: 0 }, // DB uses experience_years
    is_primary: { type: Boolean, default: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'employee_skills'
});

// Compound index for unique skill per employee
EmployeeSkillSchema.index({ employee_id: 1, skill_id: 1 }, { unique: true });

export const EmployeeSkill = model<IEmployeeSkill>('EmployeeSkill', EmployeeSkillSchema);
