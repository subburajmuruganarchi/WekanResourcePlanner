/** Default landing route after login by system access role. */
export function getHomeRoute(role: string | undefined): string {
    switch (role) {
        case 'Admin':
        case 'Project Manager':
            return '/dashboard';
        case 'Employee':
        case 'User':
        default:
            return '/time-entry';
    }
}

/** Routes restricted to specific roles (sidebar-aligned). */
export const ROUTE_ROLE_ACCESS: Record<string, string[] | '*'> = {
    '/dashboard': ['Admin', 'Project Manager'],
    '/projects': ['Admin', 'Project Manager'],
    '/allocation': ['Admin'],
    '/pm-approvals': ['Admin', 'Project Manager'],
    '/reports': ['Admin', 'Project Manager'],
    '/insights': ['Admin', 'Project Manager'],
    '/skills': ['Admin'],
    '/user-control': ['Admin'],
    '/system-health': ['Admin'],
    '/time-entry': '*',
    '/okrs': '*',
};

export function canAccessRoute(role: string | undefined, path: string): boolean {
    if (!role) return false;
    if (role === 'Admin') return true;
    const allowed = ROUTE_ROLE_ACCESS[path];
    if (!allowed) return true;
    if (allowed === '*') return true;
    return allowed.includes(role);
}
