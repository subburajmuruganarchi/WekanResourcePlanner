import { features } from '../../config/features';

export interface WeeklyHourCell {
    projectId: string;
    plannedHours: number;
    actualHours: number;
    forecastHours: number;
}

export interface EmployeeWeekInput {
    employeeId: string;
    weekStart: string;
    cells: WeeklyHourCell[];
}

export interface EmployeeWeekMetrics {
    employeeId: string;
    weekStart: string;
    capacityHours: number;
    committedHours: number;
    availableHours: number;
    utilizationPercent: number;
    benchPercent: number;
    isOverAllocated: boolean;
    plannedHours: number;
    actualHours: number;
    forecastHours: number;
    /** actual − planned (positive = worked more than planned). */
    varianceHours: number;
    /** planned − actual (positive = under-spent vs plan). */
    planVarianceHours: number;
    actualUtilizationPercent: number;
    plannedUtilizationPercent: number;
    variancePercent: number;
    forecastAccuracyPercent: number;
}

/**
 * Pure capacity math for weekly ERP planning.
 * Uses hour-based commitment (sum of planned hours across projects per week).
 */
export class WeeklyCapacityEngine {
    constructor(private readonly capacityHoursPerWeek: number = features.weeklyCapacityHours) {}

    /** Sum of planned hours across all project cells for one employee-week. */
    weeklyCommittedHours(cells: WeeklyHourCell[], field: 'planned' | 'actual' | 'forecast' = 'planned'): number {
        const key =
            field === 'planned'
                ? 'plannedHours'
                : field === 'actual'
                  ? 'actualHours'
                  : 'forecastHours';
        const total = cells.reduce((sum, c) => sum + (c[key] || 0), 0);
        return Math.round(total * 100) / 100;
    }

    availableHours(committedHours: number): number {
        const available = this.capacityHoursPerWeek - committedHours;
        return Math.round(Math.max(0, available) * 100) / 100;
    }

    utilizationPercent(committedHours: number): number {
        if (this.capacityHoursPerWeek <= 0) return 0;
        const pct = (committedHours / this.capacityHoursPerWeek) * 100;
        return Math.min(100, Math.round(pct * 100) / 100);
    }

    actualUtilizationPercent(actualHours: number): number {
        return this.utilizationPercent(actualHours);
    }

    plannedUtilizationPercent(plannedHours: number): number {
        return this.utilizationPercent(plannedHours);
    }

    /** Bench % = unallocated share of standard week capacity. */
    benchPercentFromCommitted(committedHours: number): number {
        if (this.capacityHoursPerWeek <= 0) return 0;
        const benchHours = Math.max(0, this.capacityHoursPerWeek - committedHours);
        return Math.round((benchHours / this.capacityHoursPerWeek) * 10000) / 100;
    }

    isOverAllocated(committedHours: number): boolean {
        return committedHours > this.capacityHoursPerWeek + 0.001;
    }

    /** actual − planned (positive = over plan on hours). */
    actualMinusPlannedVariance(plannedHours: number, actualHours: number): number {
        return Math.round((actualHours - plannedHours) * 100) / 100;
    }

    /** planned − actual (positive = under-spent vs plan). */
    planMinusActualVariance(plannedHours: number, actualHours: number): number {
        return Math.round((plannedHours - actualHours) * 100) / 100;
    }

    /**
     * Variance % relative to plan: (actual − planned) / planned × 100.
     * Returns 0 when planned is 0 and actual is 0; 100 when actual>0 and planned=0.
     */
    variancePercent(plannedHours: number, actualHours: number): number {
        if (plannedHours <= 0) {
            return actualHours > 0 ? 100 : 0;
        }
        const pct = ((actualHours - plannedHours) / plannedHours) * 100;
        return Math.round(pct * 100) / 100;
    }

    /**
     * Forecast accuracy: 100% when forecast equals actual; decreases with error magnitude.
     */
    forecastAccuracyPercent(forecastHours: number, actualHours: number): number {
        if (actualHours <= 0 && forecastHours <= 0) return 100;
        const denom = Math.max(actualHours, forecastHours, 1);
        const error = Math.abs(forecastHours - actualHours) / denom;
        return Math.max(0, Math.round((1 - error) * 10000) / 100);
    }

    /** @deprecated Use actualMinusPlannedVariance */
    plannedVsActualVariance(plannedHours: number, actualHours: number): number {
        return this.actualMinusPlannedVariance(plannedHours, actualHours);
    }

    computeEmployeeWeek(input: EmployeeWeekInput): EmployeeWeekMetrics {
        const plannedHours = this.weeklyCommittedHours(input.cells, 'planned');
        const actualHours = this.weeklyCommittedHours(input.cells, 'actual');
        const forecastHours = this.weeklyCommittedHours(input.cells, 'forecast');
        const committedHours = plannedHours;

        return {
            employeeId: input.employeeId,
            weekStart: input.weekStart,
            capacityHours: this.capacityHoursPerWeek,
            committedHours,
            availableHours: this.availableHours(committedHours),
            utilizationPercent: this.utilizationPercent(committedHours),
            benchPercent: this.benchPercentFromCommitted(committedHours),
            isOverAllocated: this.isOverAllocated(committedHours),
            plannedHours,
            actualHours,
            forecastHours,
            varianceHours: this.actualMinusPlannedVariance(plannedHours, actualHours),
            planVarianceHours: this.planMinusActualVariance(plannedHours, actualHours),
            actualUtilizationPercent: this.actualUtilizationPercent(actualHours),
            plannedUtilizationPercent: this.plannedUtilizationPercent(plannedHours),
            variancePercent: this.variancePercent(plannedHours, actualHours),
            forecastAccuracyPercent: this.forecastAccuracyPercent(forecastHours, actualHours),
        };
    }

    validateProposedWeek(
        existingCells: WeeklyHourCell[],
        updates: { projectId: string; plannedHours: number }[]
    ): string | null {
        const byProject = new Map<string, WeeklyHourCell>();
        for (const c of existingCells) {
            byProject.set(c.projectId, { ...c });
        }
        for (const u of updates) {
            const prev = byProject.get(u.projectId) ?? {
                projectId: u.projectId,
                plannedHours: 0,
                actualHours: 0,
                forecastHours: 0,
            };
            byProject.set(u.projectId, { ...prev, plannedHours: u.plannedHours });
        }
        const merged = [...byProject.values()];
        const committed = this.weeklyCommittedHours(merged, 'planned');
        if (this.isOverAllocated(committed)) {
            return `Weekly planned hours (${committed}) exceed capacity (${this.capacityHoursPerWeek})`;
        }
        return null;
    }

    static plannedHoursFromAllocationPercent(percent: number): number {
        return Math.round((percent / 100) * features.weeklyCapacityHours * 100) / 100;
    }

    static computeVarianceHours(plannedHours: number, actualHours: number): number {
        return new WeeklyCapacityEngine().planMinusActualVariance(plannedHours, actualHours);
    }
}

export const weeklyCapacityEngine = new WeeklyCapacityEngine();
