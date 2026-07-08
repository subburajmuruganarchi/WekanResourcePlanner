import { TokenPayload } from './jwt.utils';
import { ROLES, isExecutiveReadOnly } from '../constants/roles';
import { getManagedProjectIds } from './pm-scope.util';
import { getPortfolioProjectIds } from './delivery-scope.util';
import { features } from '../../config/features';

export interface DataScope {
    orgWide: boolean;
    projectIds?: string[];
    readOnly: boolean;
}

/** Project filter passed to dashboard, risk, and metrics services. */
export interface ProjectScopeFilter {
    projectIds?: string[];
}

/**
 * Converts resolved data scope to an API scope filter.
 * - undefined → org-wide (Admin, CEO)
 * - { projectIds: [] } → scoped role with no assigned projects (empty datasets)
 * - { projectIds: [...] } → PM / DM project filter
 */
export function toProjectScopeFilter(scope: DataScope): ProjectScopeFilter | undefined {
    if (scope.orgWide) {
        return undefined;
    }
    return { projectIds: scope.projectIds ?? [] };
}

/** True when the caller is scope-limited but has zero accessible projects. */
export function isScopedEmptyFilter(scope?: ProjectScopeFilter): boolean {
    return scope !== undefined && Array.isArray(scope.projectIds) && scope.projectIds.length === 0;
}

/** Resolve org / portfolio / PM project scope for the authenticated user. */
export async function resolveDataScope(user?: TokenPayload): Promise<DataScope> {
    if (!user?.employeeId) {
        return { orgWide: false, readOnly: true };
    }

    switch (user.role) {
        case ROLES.ADMIN:
            return { orgWide: true, readOnly: false };
        case ROLES.CEO:
            return { orgWide: true, readOnly: true };
        case ROLES.PROJECT_MANAGER:
            return {
                orgWide: false,
                projectIds: await getManagedProjectIds(user.employeeId),
                readOnly: false,
            };
        case ROLES.DELIVERY_MANAGER:
            if (features.mvpMode) {
                return { orgWide: true, readOnly: false };
            }
            return {
                orgWide: false,
                projectIds: await getPortfolioProjectIds(user.employeeId),
                readOnly: false,
            };
        default:
            return { orgWide: false, readOnly: !isExecutiveReadOnly(user.role) };
    }
}
