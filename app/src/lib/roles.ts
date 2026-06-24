/** Frontend role constants and helpers — mirror backend/src/common/constants/roles.ts */
import { normalizeRoleName } from './role-utils';

export const ROLES = {
    ADMIN: 'Admin',
    PROJECT_MANAGER: 'Project Manager',
    EMPLOYEE: 'Employee',
    USER: 'User',
    CEO: 'CEO',
    DELIVERY_MANAGER: 'Delivery Manager',
} as const;

export type SystemRoleName = (typeof ROLES)[keyof typeof ROLES];

export const MANAGEMENT_VIEW_ROLES: SystemRoleName[] = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.CEO,
    ROLES.DELIVERY_MANAGER,
];

export function isExecutiveReadOnly(role: string | undefined): boolean {
    return normalizeRoleName(role) === ROLES.CEO;
}

/** Weekly allocation grid edit — Delivery Manager only (Admin is read-only). */
export function canEditAllocations(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.DELIVERY_MANAGER;
}

export function canSeeManagementDashboard(role: string | undefined): boolean {
    return MANAGEMENT_VIEW_ROLES.includes(normalizeRoleName(role) as SystemRoleName);
}

export function canApproveTimesheets(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.ADMIN || r === ROLES.PROJECT_MANAGER || r === ROLES.DELIVERY_MANAGER;
}

export function canCreateOkrs(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.ADMIN || r === ROLES.PROJECT_MANAGER || r === ROLES.DELIVERY_MANAGER;
}

export function isDeliveryManager(role: string | undefined): boolean {
    return normalizeRoleName(role) === ROLES.DELIVERY_MANAGER;
}

export function isTeamTimeManager(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.PROJECT_MANAGER || r === ROLES.DELIVERY_MANAGER;
}

/** Self-service employee — own workspace and time entry only. */
export function isEmployeeAccessRole(role: string | undefined | null): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.EMPLOYEE || r === ROLES.USER;
}
