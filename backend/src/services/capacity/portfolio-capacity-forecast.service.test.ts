import type { AllocationConflict } from './portfolio-capacity-forecast.service';

describe('portfolio capacity forecast helpers', () => {
    function recommendation(
        capacityGapHours: number,
        conflicts: AllocationConflict[],
        projectCount: number
    ): string {
        const overAlloc = conflicts.filter((c) => c.type === 'over_allocation').length;
        const zeroPlan = conflicts.filter((c) => c.type === 'zero_planned_hours').length;
        const percentExceeded = conflicts.filter((c) => c.type === 'allocation_percent_exceeded').length;

        if (overAlloc > 0) {
            return `${overAlloc} team member(s) exceed weekly hour capacity. Rebalance planner hours or project allocations.`;
        }
        if (percentExceeded > 0) {
            return `${percentExceeded} team member(s) have concurrent allocation percentages above 100%. Adjust project_allocations date ranges or percentages.`;
        }
        if (capacityGapHours > 0) {
            return `${capacityGapHours}h of allocated portfolio capacity is not reflected in the current-week planner across ${projectCount} project(s).`;
        }
        if (zeroPlan > 0) {
            return `${zeroPlan} allocated member(s) have no planned hours this week. Update weekly_allocation_entries for the portfolio.`;
        }
        return 'Portfolio capacity is balanced for the current week based on project_allocations and weekly planner hours.';
    }

    it('prioritizes over-allocation conflicts in recommendation', () => {
        const text = recommendation(10, [{ type: 'over_allocation' } as AllocationConflict], 2);
        expect(text).toMatch(/exceed weekly hour capacity/);
    });

    it('reports capacity gap when planner hours lag allocations', () => {
        const text = recommendation(16, [], 3);
        expect(text).toMatch(/16h of allocated portfolio capacity/);
    });

    it('reports balanced state when no gaps or conflicts', () => {
        const text = recommendation(0, [], 2);
        expect(text).toMatch(/balanced/);
    });
});
