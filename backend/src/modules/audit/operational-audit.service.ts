import { Types } from 'mongoose';
import { OperationalAudit, OperationalAuditAction } from './operational-audit.model';

import { TokenPayload } from '../../common/utils/jwt.utils';

export interface AuditActor {
    employeeId?: string;
    name?: string;
    role?: string;
    email?: string;
}

export async function recordOperationalAudit(params: {
    action: OperationalAuditAction;
    actor?: AuditActor;
    summary: string;
    detail?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        await OperationalAudit.create({
            action: params.action,
            actor_employee_id:
                params.actor?.employeeId && Types.ObjectId.isValid(params.actor.employeeId)
                    ? new Types.ObjectId(params.actor.employeeId)
                    : undefined,
            actor_name: params.actor?.name,
            actor_role: params.actor?.role,
            actor_email: params.actor?.email,
            summary: params.summary,
            detail: params.detail,
            entity_type: params.entityType,
            entity_id: params.entityId,
            metadata: params.metadata,
        });
    } catch {
        // Audit must not break primary workflows.
    }
}

export function auditActorFromUser(user?: {
    employeeId?: string;
    name?: string;
    role?: string;
    email?: string;
}): AuditActor | undefined {
    if (!user) return undefined;
    return {
        employeeId: user.employeeId,
        name: user.name ?? user.email,
        role: user.role,
        email: user.email,
    };
}

export function auditActorFromRequest(user?: TokenPayload): AuditActor | undefined {
    if (!user) return undefined;
    return auditActorFromUser({
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
    });
}
