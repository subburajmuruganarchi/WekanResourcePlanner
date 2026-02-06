import { Document, Schema, model } from 'mongoose';

export interface ISkill extends Document {
    name: string;
    category: string;
    isActive: boolean;
}

const SkillSchema = new Schema<ISkill>({
    name: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Skill = model<ISkill>('Skill', SkillSchema);
