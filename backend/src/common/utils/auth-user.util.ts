import { TokenPayload } from './jwt.utils';

/** Canonical employee Mongo ID from JWT (never use `user.id` — not on TokenPayload). */
export function getAuthEmployeeId(user?: TokenPayload): string | undefined {
    return user?.employeeId;
}

/** Normalize legacy role strings at auth boundary. */
export function normalizeRoleName(role: string): string {
    if (role === 'ProjectManager') return 'Project Manager';
    return role;
}

/** Employees may only act on their own employeeId unless Admin/PM. */
export function assertEmployeeScope(
    user: { role: string; employeeId: string } | undefined,
    targetEmployeeId: string
): { ok: true } | { ok: false; message: string } {
    if (!user) {
        return { ok: false, message: 'Authentication required.' };
    }
    if (user.role === 'Admin' || user.role === 'Project Manager') {
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
