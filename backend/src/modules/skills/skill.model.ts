import { Document, Schema, model } from 'mongoose';

// Matches resource-360 database structure (skills collection)
export interface ISkill extends Document {
    name: string;
    category: string;
    description?: string;
    is_active: boolean;
}

const SkillSchema = new Schema<ISkill>({
    name: { type: String, required: true, unique: true, index: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    is_active: { type: Boolean, default: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'skills'
});

export const Skill = model<ISkill>('Skill', SkillSchema);
