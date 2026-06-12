import { Document, Schema, model } from 'mongoose';

// Matches resource-360 database structure (roles collection)
export interface IRole extends Document {
    role_name: string;
    department?: string;
    description?: string;
    default_rate?: number;
    is_active: boolean;
}

const RoleSchema = new Schema<IRole>({
    role_name: { type: String, required: true, unique: true, index: true, trim: true },
    department: { type: String, trim: true },
    description: { type: String, trim: true },
    default_rate: { type: Number },
    is_active: { type: Boolean, default: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'roles'
});

export const Role = model<IRole>('Role', RoleSchema);
