import { Document, Schema, Types, model } from 'mongoose';

// Matches ACTUAL resource-360 database structure
export interface IEmployee extends Document {
    first_name: string;
    last_name: string;
    email: string;
    employee_code?: string;  // Optional - not all records have this
    status: string;
    role_id?: Types.ObjectId;  // Optional - not all records have this
    department?: string;
    position?: string;  // DB uses 'position' not 'designation'
    password?: string; // Hashed password
    max_allocation_percent?: number;
    join_date?: Date;  // DB uses 'join_date' not 'joining_date'
    exit_date?: Date;
    is_active?: boolean;
    profile_image?: string;  // DB uses 'profile_image' not 'avatar_url'
    created_at?: Date;
    updated_at?: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    employee_code: { type: String, unique: true, sparse: true, index: true, uppercase: true, trim: true },
    status: { type: String, default: 'Active' },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role' },
    department: { type: String, trim: true },
    position: { type: String, trim: true },
    password: { type: String, select: false },
    max_allocation_percent: { type: Number, default: 100, min: 1, max: 100 },
    join_date: { type: Date },
    exit_date: { type: Date },
    is_active: { type: Boolean, default: true },
    profile_image: { type: String, trim: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'employees'
});

export const Employee = model<IEmployee>('Employee', EmployeeSchema);
