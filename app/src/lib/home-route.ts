import {
    ROLES,
    MANAGEMENT_VIEW_ROLES,
    isExecutiveReadOnly,
} from '@/lib/roles';

/** Default landing route after login by system access role. */
export function getHomeRoute(role: string | undefined): string {
    switch (role) {
        case ROLES.ADMIN:
        case ROLES.PROJECT_MANAGER:
        case ROLES.CEO:
        case ROLES.DELIVERY_MANAGER:
            return '/dashboard';
        case ROLES.EMPLOYEE:
        case ROLES.USER:
        default:
            return '/time-entry';
    }
}

const managementRoutes = MANAGEMENT_VIEW_ROLES as string[];

/** Routes restricted to specific roles (sidebar-aligned). */
export const ROUTE_ROLE_ACCESS: Record<string, string[] | '*'> = {
    '/dashboard': managementRoutes,
    '/projects': managementRoutes,
    '/allocation': managementRoutes,
    '/weekly-planner': managementRoutes,
    '/pm-approvals': [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
    '/reports': managementRoutes,
    '/insights': managementRoutes,
    '/skills': [ROLES.ADMIN],
    '/inputs': [ROLES.ADMIN],
    '/user-control': [ROLES.ADMIN],
    '/portfolios': [ROLES.ADMIN],
    '/system-health': [ROLES.ADMIN],
    '/time-entry': [ROLES.EMPLOYEE, ROLES.USER, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DELIVERY_MANAGER],
    '/okrs': '*',
};

export function canAccessRoute(role: string | undefined, path: string): boolean {
    if (!role) return false;
    if (role === ROLES.ADMIN) return true;
    if (isExecutiveReadOnly(role) && path === '/time-entry') return false;
    const allowed = ROUTE_ROLE_ACCESS[path];
    if (!allowed) return true;
    if (allowed === '*') return true;
    return allowed.includes(role);
}
