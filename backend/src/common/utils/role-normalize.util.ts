import { ROLES, type SystemRoleName } from '../constants/roles';

/** Map legacy / sheet role strings to canonical system access roles. Keep in sync with app role-utils.ts */
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

/** Normalize legacy role strings at auth boundary. */
export function normalizeRoleName(role: string | undefined | null): string {
    const raw = String(role ?? '').trim();
    if (!raw) return ROLES.USER;

    const values = Object.values(ROLES) as string[];
    if (values.includes(raw)) {
        return raw;
    }

    const key = raw.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    const mapped = CANONICAL_BY_KEY[key];
    if (mapped) return mapped;

    const compact = key.replace(/\s/g, '');
    if (CANONICAL_BY_KEY[compact]) {
        return CANONICAL_BY_KEY[compact];
    }

    if (raw === 'ProjectManager') return ROLES.PROJECT_MANAGER;

    return raw;
}

/** Employee / User access — self-service workspace and time entry. */
export function isEmployeeAccessRole(role: string | undefined | null): boolean {
    const r = normalizeRoleName(role);
    return r === ROLES.EMPLOYEE || r === ROLES.USER;
}
