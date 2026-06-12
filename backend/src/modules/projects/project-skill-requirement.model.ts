import { Document, Schema, Types, model } from 'mongoose';
import { SkillLevel } from '../../common/types/enums';

// Separate collection for project skill requirements (matches resource-360 structure)
export interface IProjectSkillRequirement extends Document {
    project_id: Types.ObjectId;
    skill_id: Types.ObjectId;
    min_skill_level?: SkillLevel;
    required_headcount: number;
    required_days?: number;
    start_date: Date;
    end_date: Date;
    role_id?: Types.ObjectId;
}

const ProjectSkillRequirementSchema = new Schema<IProjectSkillRequirement>({
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    skill_id: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    min_skill_level: { type: String, enum: Object.values(SkillLevel), default: SkillLevel.INTERMEDIATE },
    required_headcount: { type: Number, required: true, min: 1 },
    required_days: { type: Number, min: 1 },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'project_skill_requirements'
});

export const ProjectSkillRequirement = model<IProjectSkillRequirement>('ProjectSkillRequirement', ProjectSkillRequirementSchema);
