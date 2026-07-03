import { features } from '../../config/features';
import { ROLES, SystemRoleName } from '../constants/roles';
import { normalizeRoleName } from './role-normalize.util';
import { getManagedProjectIds, isProjectManagedBy } from './pm-scope.util';

/** Delivery Manager, CEO, and Admin — org-wide project/people management in MVP mode. */
export const MVP_ORG_ADMIN_ROLES: SystemRoleName[] = [
    ROLES.ADMIN,
    ROLES.CEO,
    ROLES.DELIVERY_MANAGER,
];

export function isMvpMode(): boolean {
    return features.mvpMode;
}

export function canManageOrgEntities(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    if (!features.mvpMode) {
        return r === ROLES.ADMIN;
    }
    return MVP_ORG_ADMIN_ROLES.includes(r as SystemRoleName);
}

/** MVP: PM, DM, CEO, Admin see all projects. Legacy: role-specific scoping in controllers. */
export function shouldViewAllProjects(role: string | undefined): boolean {
    if (!features.mvpMode) return false;
    const r = normalizeRoleName(role);
    return (
        r === ROLES.PROJECT_MANAGER ||
        r === ROLES.DELIVERY_MANAGER ||
        r === ROLES.CEO ||
        r === ROLES.ADMIN
    );
}

/** Weekly allocation grid — read access in MVP includes employees. */
export function canViewResourceAllocationGrid(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    if (!features.mvpMode) {
        return (
            r === ROLES.ADMIN ||
            r === ROLES.PROJECT_MANAGER ||
            r === ROLES.CEO ||
            r === ROLES.DELIVERY_MANAGER
        );
    }
    return true;
}

/** Weekly planned/actual hours on the allocation grid — PM only (scoped to managed projects). */
export function canEditWeeklyAllocationGrid(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    if (!features.mvpMode) {
        return r === ROLES.DELIVERY_MANAGER;
    }
    return r === ROLES.PROJECT_MANAGER;
}

/** Assign employees to projects (project_allocations API). PM scoped; DM any project. */
export function canAssignEmployeesToProjects(role: string | undefined): boolean {
    const r = normalizeRoleName(role);
    if (!features.mvpMode) {
        return r === ROLES.DELIVERY_MANAGER || r === ROLES.PROJECT_MANAGER;
    }
    return (
        r === ROLES.PROJECT_MANAGER ||
        r === ROLES.DELIVERY_MANAGER ||
        r === ROLES.ADMIN
    );
}

export async function assertCanAssignToProject(
    role: string | undefined,
    actorEmployeeId: string | undefined,
    projectId: string
): Promise<void> {
    const r = normalizeRoleName(role);
    if (!features.mvpMode) return;

    if (r === ROLES.DELIVERY_MANAGER || r === ROLES.ADMIN || r === ROLES.CEO) {
        return;
    }
    if (r === ROLES.PROJECT_MANAGER && actorEmployeeId) {
        if (await isProjectManagedBy(actorEmployeeId, projectId)) {
            return;
        }
    }
    throw new Error('You do not have permission to modify assignments for this project');
}

export async function assertCanEditWeeklyGridForProjects(
    role: string | undefined,
    actorEmployeeId: string | undefined,
    projectIds: string[]
): Promise<void> {
    if (!features.mvpMode) return;

    const r = normalizeRoleName(role);
    if (r !== ROLES.PROJECT_MANAGER || !actorEmployeeId) {
        throw new Error('Only Project Managers can edit resource allocations in MVP mode');
    }

    const managed = new Set(await getManagedProjectIds(actorEmployeeId));
    const outOfScope = projectIds.filter((id) => !managed.has(id));
    if (outOfScope.length > 0) {
        throw new Error('Cannot edit allocations outside your assigned projects');
    }
}

export function projectCrudRoles(): SystemRoleName[] {
    if (!features.mvpMode) {
        return [ROLES.ADMIN];
    }
    return MVP_ORG_ADMIN_ROLES;
}

export function projectUpdateRoles(): SystemRoleName[] {
    if (!features.mvpMode) {
        return [ROLES.ADMIN, ROLES.PROJECT_MANAGER];
    }
    return MVP_ORG_ADMIN_ROLES;
}

export function employeeCrudRoles(): SystemRoleName[] {
    if (!features.mvpMode) {
        return [ROLES.ADMIN];
    }
    return MVP_ORG_ADMIN_ROLES;
}

export function weeklyGridPutRoles(): SystemRoleName[] {
    if (!features.mvpMode) {
        return [ROLES.DELIVERY_MANAGER];
    }
    return [ROLES.PROJECT_MANAGER];
}

export function weeklyGridGetRoles(): SystemRoleName[] {
    if (!features.mvpMode) {
        return [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CEO, ROLES.DELIVERY_MANAGER];
    }
    return [
        ROLES.ADMIN,
        ROLES.PROJECT_MANAGER,
        ROLES.CEO,
        ROLES.DELIVERY_MANAGER,
        ROLES.EMPLOYEE,
        ROLES.USER,
    ];
}
