import { ProjectStatus } from '../../common/types/enums';
import {
    normalizeProjectStatus,
    isOperationalProjectStatus,
    isActiveProjectStatus,
    projectStatusListMongoFilter,
} from './project-status.util';

describe('project-status.util', () => {
    it('normalizes sheet variants to canonical status', () => {
        expect(normalizeProjectStatus('active')).toBe(ProjectStatus.ACTIVE);
        expect(normalizeProjectStatus('Active')).toBe(ProjectStatus.ACTIVE);
        expect(normalizeProjectStatus('ACTIVE')).toBe(ProjectStatus.ACTIVE);
        expect(normalizeProjectStatus('In Progress')).toBe(ProjectStatus.ACTIVE);
        expect(normalizeProjectStatus('planning')).toBe(ProjectStatus.PLANNING);
        expect(normalizeProjectStatus('Proposal')).toBe(ProjectStatus.PLANNING);
        expect(normalizeProjectStatus('On Hold')).toBe(ProjectStatus.ON_HOLD);
        expect(normalizeProjectStatus('OnHold')).toBe(ProjectStatus.ON_HOLD);
        expect(normalizeProjectStatus('completed')).toBe(ProjectStatus.COMPLETED);
    });

    it('classifies operational vs active', () => {
        expect(isOperationalProjectStatus(ProjectStatus.ACTIVE)).toBe(true);
        expect(isOperationalProjectStatus(ProjectStatus.PLANNING)).toBe(true);
        expect(isOperationalProjectStatus(ProjectStatus.COMPLETED)).toBe(false);
        expect(isActiveProjectStatus(ProjectStatus.PLANNING)).toBe(false);
    });

    it('builds mongo filters that match sheet variants', () => {
        const active = projectStatusListMongoFilter(ProjectStatus.ACTIVE);
        expect(active).toHaveProperty('$or');
        expect(active.is_active).toEqual({ $ne: false });

        const planning = projectStatusListMongoFilter(ProjectStatus.PLANNING);
        expect(planning).toHaveProperty('$or');
    });
});
