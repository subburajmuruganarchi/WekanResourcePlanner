import { ROLES, type SystemRoleName } from './roles';

/** Map legacy / sheet role strings to canonical system access roles. Keep in sync with backend auth-user.util. */
const CANONICAL_BY_KEY: Record<string, SystemRoleName> = {
    admin: ROLES.ADMIN,
    administrator: ROLES.ADMIN,
    leadership: ROLES.ADMIN,
    projectmanager: ROLES.PROJECT_MANAGER,
    'project manager': ROLES.PROJECT_MANAGER,
    pm: ROLES.PROJECT_MANAGER,
    ceo: ROLES.CEO,
    executive: ROLES.CEO,
    'chief executive officer': ROLES.CEO,
    deliverymanager: ROLES.DELIVERY_MANAGER,
    'delivery manager': ROLES.DELIVERY_MANAGER,
    dm: ROLES.DELIVERY_MANAGER,
    employee: ROLES.EMPLOYEE,
    user: ROLES.USER,
};

const DISPLAY_LABELS: Record<SystemRoleName, string> = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.PROJECT_MANAGER]: 'Project Manager',
    [ROLES.CEO]: 'Chief Executive Officer',
    [ROLES.DELIVERY_MANAGER]: 'Delivery Manager',
    [ROLES.EMPLOYEE]: 'Employee',
    [ROLES.USER]: 'Employee',
};

const WORKSPACE_LABELS: Record<SystemRoleName, string> = {
    [ROLES.ADMIN]: 'Admin Operations',
    [ROLES.PROJECT_MANAGER]: 'Project Workspace',
    [ROLES.CEO]: 'Executive Command',
    [ROLES.DELIVERY_MANAGER]: 'Delivery Command',
    [ROLES.EMPLOYEE]: 'My Workspace',
    [ROLES.USER]: 'My Workspace',
};

/** Normalize any role string to a canonical system access role. */
export function normalizeRoleName(role: string | undefined | null): SystemRoleName | string {
    const raw = String(role ?? '').trim();
    if (!raw) return ROLES.USER;

    const values = Object.values(ROLES) as string[];
    if (values.includes(raw)) {
        return raw as SystemRoleName;
    }

    const key = raw.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    const mapped = CANONICAL_BY_KEY[key];
    if (mapped) return mapped;

    // CamelCase without spaces: ProjectManager, DeliveryManager
    const compact = key.replace(/\s/g, '');
    if (CANONICAL_BY_KEY[compact]) {
        return CANONICAL_BY_KEY[compact];
    }

    return raw;
}

export interface RoleDisplayContext {
    jobRole?: string | null;
    position?: string | null;
}

/** User-facing access role label (sidebar footer). Employee accounts show Resource sheet job role. */
export function getRoleDisplayLabel(
    role: string | undefined | null,
    context?: RoleDisplayContext,
): string {
    const canonical = normalizeRoleName(role);

    if (canonical === ROLES.EMPLOYEE || canonical === ROLES.USER) {
        const jobRole = String(context?.jobRole ?? '').trim();
        if (jobRole) return jobRole;
        const position = String(context?.position ?? '').trim();
        if (position) return position;
    }

    if (typeof canonical === 'string' && canonical in DISPLAY_LABELS) {
        return DISPLAY_LABELS[canonical as SystemRoleName];
    }
    return String(role ?? 'User').trim() || 'User';
}

/** Persona / app name under the logo (sidebar header). */
export function getWorkspacePersonaLabel(role: string | undefined | null): string {
    const canonical = normalizeRoleName(role);
    if (typeof canonical === 'string' && canonical in WORKSPACE_LABELS) {
        return WORKSPACE_LABELS[canonical as SystemRoleName];
    }
    return 'Workspace';
}

export function isKnownSystemRole(role: string | undefined | null): role is SystemRoleName {
    const canonical = normalizeRoleName(role);
    return (Object.values(ROLES) as string[]).includes(canonical);
}
