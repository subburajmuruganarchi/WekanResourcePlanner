import { Document, Schema, model } from 'mongoose';

export interface IRole extends Document {
    name: string;
    defaultRate?: number;
    isActive: boolean;
}

const RoleSchema = new Schema<IRole>({
    name: { type: String, required: true, unique: true, index: true },
    defaultRate: { type: Number },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Role = model<IRole>('Role', RoleSchema);
