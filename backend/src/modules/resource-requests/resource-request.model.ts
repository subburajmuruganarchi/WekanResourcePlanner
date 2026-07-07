import { Document, Schema, Types, model } from 'mongoose';

export type ResourceRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface IResourceRequest extends Document {
    project_id: Types.ObjectId;
    employee_id: Types.ObjectId;
    requested_by_id: Types.ObjectId;
    role_id?: Types.ObjectId;
    allocation_percent: number;
    start_date: Date;
    end_date: Date;
    justification: string;
    status: ResourceRequestStatus;
    reviewed_by_id?: Types.ObjectId;
    reviewed_at?: Date;
    review_notes?: string;
    allocation_id?: Types.ObjectId;
    created_at: Date;
    updated_at: Date;
}

const ResourceRequestSchema = new Schema<IResourceRequest>(
    {
        project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
        requested_by_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
        role_id: { type: Schema.Types.ObjectId, ref: 'Role' },
        allocation_percent: { type: Number, required: true, min: 1, max: 100 },
        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },
        justification: { type: String, required: true, trim: true, minlength: 10 },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
            default: 'Pending',
            index: true,
        },
        reviewed_by_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
        reviewed_at: { type: Date },
        review_notes: { type: String, trim: true },
        allocation_id: { type: Schema.Types.ObjectId, ref: 'ProjectAllocation' },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'resource_requests',
    }
);

ResourceRequestSchema.index({ status: 1, created_at: -1 });

export const ResourceRequest = model<IResourceRequest>('ResourceRequest', ResourceRequestSchema);
