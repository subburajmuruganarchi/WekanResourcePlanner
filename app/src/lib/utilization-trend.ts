import type { UtilizationVarianceRow } from '@/types/utilization';

export const WEEKLY_CAPACITY_HOURS = 40;

export interface UtilizationTrendPoint {
    weekStart: string;
    weekLabel: string;
    plannedUtilization: number;
    actualUtilization: number;
    plannedHours: number;
    actualHours: number;
    employeeCount: number;
    utilizationGap: number;
}

export interface EmployeeWeeklyHoursPoint {
    weekStart: string;
    weekLabel: string;
    hours: number;
    utilizationPercent: number;
    isCurrentWeek: boolean;
}

function formatWeekLabel(weekStartIso: string): string {
    const d = new Date(`${weekStartIso}T00:00:00.000Z`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Workforce avg utilization per week from planner + timesheet variance rows. */
export function buildWorkforceUtilizationTrend(
    rows: UtilizationVarianceRow[],
    options: { maxWeeks?: number; capacityHours?: number } = {}
): UtilizationTrendPoint[] {
    const capacity = options.capacityHours ?? WEEKLY_CAPACITY_HOURS;
    const maxWeeks = options.maxWeeks ?? 12;

    const byWeek = new Map<string, Map<string, { planned: number; actual: number }>>();

    for (const row of rows) {
        const weekMap = byWeek.get(row.weekStart) ?? new Map();
        const emp = weekMap.get(row.employeeId) ?? { planned: 0, actual: 0 };
        emp.planned += row.plannedHours ?? 0;
        emp.actual += row.actualHours ?? 0;
        weekMap.set(row.employeeId, emp);
        byWeek.set(row.weekStart, weekMap);
    }

    return [...byWeek.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-maxWeeks)
        .map(([weekStart, employees]) => {
            const totals = [...employees.values()];
            const employeeCount = totals.length;
            const plannedHours = totals.reduce((s, e) => s + e.planned, 0);
            const actualHours = totals.reduce((s, e) => s + e.actual, 0);

            const plannedUtilization =
                employeeCount > 0
                    ? Math.round(
                          (totals.reduce((s, e) => s + Math.min(100, (e.planned / capacity) * 100), 0) /
                              employeeCount) *
                              10
                      ) / 10
                    : 0;

            const actualUtilization =
                employeeCount > 0
                    ? Math.round(
                          (totals.reduce((s, e) => s + Math.min(100, (e.actual / capacity) * 100), 0) /
                              employeeCount) *
                              10
                      ) / 10
                    : 0;

            return {
                weekStart,
                weekLabel: formatWeekLabel(weekStart),
                plannedUtilization,
                actualUtilization,
                plannedHours: Math.round(plannedHours * 10) / 10,
                actualHours: Math.round(actualHours * 10) / 10,
                employeeCount,
                utilizationGap: Math.round((actualUtilization - plannedUtilization) * 10) / 10,
            };
        });
}

export function buildEmployeeWeeklyHoursTrend(
    weeks: { weekStart: string; hours: number }[],
    currentWeekStart: string,
    capacityHours = WEEKLY_CAPACITY_HOURS
): EmployeeWeeklyHoursPoint[] {
    return weeks.map(({ weekStart, hours }) => ({
        weekStart,
        weekLabel: formatWeekLabel(weekStart),
        hours: Math.round(hours * 10) / 10,
        utilizationPercent:
            capacityHours > 0 ? Math.min(100, Math.round((hours / capacityHours) * 100)) : 0,
        isCurrentWeek: weekStart === currentWeekStart,
    }));
}
