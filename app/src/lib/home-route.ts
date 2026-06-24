import { ROLES, isExecutiveReadOnly, isEmployeeAccessRole } from '@/lib/roles';
import { ROUTE_ACCESS } from '@/lib/navigation-config';
import type { SystemRoleName } from '@/lib/roles';
import { normalizeRoleName } from '@/lib/role-utils';

const PROJECT_DETAIL_PATH = /^\/projects\/[^/]+$/;

export function getHomeRoute(role: string | undefined): string {
    const r = normalizeRoleName(role);
    switch (r) {
        case ROLES.CEO:
            return '/executive';
        case ROLES.DELIVERY_MANAGER:
            return '/delivery';
        case ROLES.PROJECT_MANAGER:
            return '/pm';
        case ROLES.ADMIN:
            return '/dashboard';
        case ROLES.EMPLOYEE:
        case ROLES.USER:
        default:
            return '/workspace';
    }
}

function resolveRouteKey(path: string): string {
    if (path.startsWith('/projects/')) return '/projects';
    if (ROUTE_ACCESS[path]) return path;
    const two = path.split('/').slice(0, 2).join('/');
    if (ROUTE_ACCESS[two]) return two;
    return path;
}

export function canAccessRoute(role: string | undefined, path: string): boolean {
    if (!role) return false;
    const r = normalizeRoleName(role);
    if (r === ROLES.ADMIN) return true;
    if (isExecutiveReadOnly(r) && path === '/time-entry') return false;

    // Employees may open assigned project detail (read-only) from My Workspace, not the projects list.
    if (isEmployeeAccessRole(r)) {
        if (PROJECT_DETAIL_PATH.test(path)) return true;
        if (path === '/projects' || path.startsWith('/projects/')) return false;
    }

    const key = resolveRouteKey(path);
    const allowed = ROUTE_ACCESS[key];
    if (!allowed) return true;
    if (allowed === '*') return true;
    return allowed.includes(r as SystemRoleName);
}
