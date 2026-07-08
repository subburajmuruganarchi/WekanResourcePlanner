import { Document, Schema, Types, model } from 'mongoose';

export type OperationalAuditAction =
    | 'resource_assigned'
    | 'resource_removed'
    | 'project_created'
    | 'project_updated'
    | 'allocation_created';

export interface IOperationalAudit extends Document {
    action: OperationalAuditAction;
    actor_employee_id?: Types.ObjectId;
    actor_name?: string;
    actor_role?: string;
    actor_email?: string;
    summary: string;
    detail?: string;
    entity_type?: string;
    entity_id?: string;
    metadata?: Record<string, unknown>;
    created_at?: Date;
}

const OperationalAuditSchema = new Schema<IOperationalAudit>(
    {
        action: { type: String, required: true, index: true },
        actor_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
        actor_name: { type: String, trim: true },
        actor_role: { type: String, trim: true },
        actor_email: { type: String, trim: true },
        summary: { type: String, required: true, trim: true },
        detail: { type: String, trim: true },
        entity_type: { type: String, trim: true, index: true },
        entity_id: { type: String, trim: true, index: true },
        metadata: { type: Schema.Types.Mixed },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: false },
        collection: 'operational_audit_logs',
    }
);

export const OperationalAudit = model<IOperationalAudit>(
    'OperationalAudit',
    OperationalAuditSchema
);
