import { TokenPayload } from './jwt.utils';
import { ROLES, isExecutiveReadOnly } from '../constants/roles';
import { getManagedProjectIds } from './pm-scope.util';
import { getPortfolioProjectIds } from './delivery-scope.util';

export interface DataScope {
    orgWide: boolean;
    projectIds?: string[];
    readOnly: boolean;
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
            return {
                orgWide: false,
                projectIds: await getPortfolioProjectIds(user.employeeId),
                readOnly: false,
            };
        default:
            return { orgWide: false, readOnly: !isExecutiveReadOnly(user.role) };
    }
}
