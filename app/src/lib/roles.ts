/** Frontend role constants and helpers — mirror backend/src/common/constants/roles.ts */
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
    return role === ROLES.CEO;
}

export function canEditAllocations(role: string | undefined): boolean {
    return role === ROLES.ADMIN || role === ROLES.DELIVERY_MANAGER;
}

export function canSeeManagementDashboard(role: string | undefined): boolean {
    return MANAGEMENT_VIEW_ROLES.includes(role as SystemRoleName);
}

export function canApproveTimesheets(role: string | undefined): boolean {
    return (
        role === ROLES.ADMIN ||
        role === ROLES.PROJECT_MANAGER ||
        role === ROLES.DELIVERY_MANAGER
    );
}

export function canCreateOkrs(role: string | undefined): boolean {
    return (
        role === ROLES.ADMIN ||
        role === ROLES.PROJECT_MANAGER ||
        role === ROLES.DELIVERY_MANAGER
    );
}

export function isDeliveryManager(role: string | undefined): boolean {
    return role === ROLES.DELIVERY_MANAGER;
}

export function isTeamTimeManager(role: string | undefined): boolean {
    return role === ROLES.PROJECT_MANAGER || role === ROLES.DELIVERY_MANAGER;
}
