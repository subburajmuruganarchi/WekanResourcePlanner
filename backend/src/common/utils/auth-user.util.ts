import { TokenPayload } from './jwt.utils';
import { ROLES } from '../constants/roles';
import { isEmployeeAllocatedToManagedProjects } from './pm-scope.util';
import { isEmployeeAllocatedToPortfolioProjects } from './delivery-scope.util';
import { normalizeRoleName as normalizeRole } from './role-normalize.util';

/** Canonical employee Mongo ID from JWT (never use `user.id` — not on TokenPayload). */
export function getAuthEmployeeId(user?: TokenPayload): string | undefined {
    return user?.employeeId;
}

/** @deprecated Use normalizeRole from role-normalize.util */
export function normalizeRoleName(role: string): string {
    return normalizeRole(role);
}

/** Employees may only act on their own employeeId unless Admin/PM. */
export function assertEmployeeScope(
    user: { role: string; employeeId: string } | undefined,
    targetEmployeeId: string
): { ok: true } | { ok: false; message: string } {
    if (!user) {
        return { ok: false, message: 'Authentication required.' };
    }
    const role = normalizeRole(user.role);
    if (
        role === ROLES.ADMIN ||
        role === ROLES.PROJECT_MANAGER ||
        role === ROLES.DELIVERY_MANAGER ||
        role === ROLES.CEO
    ) {
        return { ok: true };
    }
    if (targetEmployeeId !== user.employeeId) {
        return {
            ok: false,
            message: 'Access denied. You can only manage your own time entries.',
        };
    }
    return { ok: true };
}

/** Time entry scope: PM may only access employees allocated to their managed projects. */
export async function assertTimeEntryEmployeeScope(
    user: { role: string; employeeId: string } | undefined,
    targetEmployeeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!user) {
        return { ok: false, message: 'Authentication required.' };
    }
    const role = normalizeRole(user.role);
    if (role === ROLES.ADMIN || role === ROLES.CEO) {
        return { ok: true };
    }
    if (role === ROLES.PROJECT_MANAGER) {
        const pmId = user.employeeId;
        if (!pmId) {
            return { ok: false, message: 'Authentication required.' };
        }
        const allowed = await isEmployeeAllocatedToManagedProjects(pmId, targetEmployeeId);
        if (!allowed) {
            return {
                ok: false,
                message: 'Access denied. Employee is not allocated to your managed projects.',
            };
        }
        return { ok: true };
    }
    if (role === ROLES.DELIVERY_MANAGER) {
        const dmId = user.employeeId;
        if (!dmId) {
            return { ok: false, message: 'Authentication required.' };
        }
        const allowed = await isEmployeeAllocatedToPortfolioProjects(dmId, targetEmployeeId);
        if (!allowed) {
            return {
                ok: false,
                message: 'Access denied. Employee is not allocated to your portfolio projects.',
            };
        }
        return { ok: true };
    }
    if (targetEmployeeId !== user.employeeId) {
        return {
            ok: false,
            message: 'Access denied. You can only manage your own time entries.',
        };
    }
    return { ok: true };
}
