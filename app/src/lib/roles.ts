/** Frontend role constants and helpers — mirror backend/src/common/constants/roles.ts */
import { normalizeRoleName } from './role-utils';
import { getMvpFeatures } from './mvp-config';

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

/** Weekly planned hours — PM (scoped), DM (any), Admin (any). CEO read-only. */
export function canEditPlannedAllocations(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    const { mvpMode } = getMvpFeatures();
    if (mvpMode) {
        return (
            r === ROLES.PROJECT_MANAGER ||
            r === ROLES.DELIVERY_MANAGER ||
            r === ROLES.ADMIN
        );
    }
    return r === ROLES.DELIVERY_MANAGER;
}

/** Actual hours — PM (scoped), DM (any), Admin (any). CEO read-only. */
export function canEditActualAllocations(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    const { mvpMode } = getMvpFeatures();
    if (mvpMode) {
        return (
            r === ROLES.PROJECT_MANAGER ||
            r === ROLES.DELIVERY_MANAGER ||
            r === ROLES.ADMIN
        );
    }
    return r === ROLES.DELIVERY_MANAGER;
}

/** @deprecated use canEditPlannedAllocations */
export function canEditAllocations(role: string | undefined): boolean {
    return canEditPlannedAllocations(role);
}

/** MVP: assign employees to projects — PM (scoped) + DM + Admin. */
export function canAssignProjectStaff(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    const { mvpMode } = getMvpFeatures();
    if (!mvpMode) {
        return r === ROLES.DELIVERY_MANAGER || r === ROLES.PROJECT_MANAGER;
    }
    return (
        r === ROLES.PROJECT_MANAGER ||
        r === ROLES.DELIVERY_MANAGER ||
        r === ROLES.ADMIN
    );
}

/** Org-wide project and employee CRUD in MVP (DM, CEO, Admin). */
export function canManageOrgEntities(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    const { mvpMode } = getMvpFeatures();
    if (!mvpMode) return r === ROLES.ADMIN;
    return (
        r === ROLES.ADMIN ||
        r === ROLES.CEO ||
        r === ROLES.DELIVERY_MANAGER
    );
}

export function isAllocationViewerReadOnly(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.CEO;
}
export function canViewResourceAllocation(role: string | undefined): boolean {
    const { mvpMode } = getMvpFeatures();
    if (!mvpMode) return canSeeManagementDashboard(role);
    return true;
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
