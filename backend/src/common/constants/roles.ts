/** Canonical system access role names. */
export const ROLES = {
    ADMIN: 'Admin',
    PROJECT_MANAGER: 'Project Manager',
    EMPLOYEE: 'Employee',
    USER: 'User',
    CEO: 'CEO',
    DELIVERY_MANAGER: 'Delivery Manager',
} as const;

export type SystemRoleName = (typeof ROLES)[keyof typeof ROLES];

/** Dashboard, reports, insights, allocation/planner view. */
export const MANAGEMENT_VIEW_ROLES: SystemRoleName[] = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.CEO,
    ROLES.DELIVERY_MANAGER,
];

/** Org-wide read-only executive. */
export const EXECUTIVE_READ_ROLES: SystemRoleName[] = [ROLES.CEO];

/** Weekly allocation grid edit (DM portfolio scope; Admin is read-only). */
export const ALLOCATION_EDIT_ROLES: SystemRoleName[] = [ROLES.DELIVERY_MANAGER];

/** Timesheet approval queue. */
export const APPROVAL_ROLES: SystemRoleName[] = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.DELIVERY_MANAGER,
];

/** OKR create/update (not delete). */
export const OKR_CREATE_ROLES: SystemRoleName[] = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.DELIVERY_MANAGER,
];

/** Roles that can view any employee OKR (not own-only). */
export const OKR_MANAGEMENT_VIEW_ROLES: SystemRoleName[] = MANAGEMENT_VIEW_ROLES;

export function isExecutiveReadOnly(role: string | undefined): boolean {
    return role === ROLES.CEO;
}

export function canEditAllocations(role: string | undefined): boolean {
    return role === ROLES.DELIVERY_MANAGER;
}
