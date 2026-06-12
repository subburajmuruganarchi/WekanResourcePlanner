import type {
    WeeklyAllocationGridRow,
    WeeklyAllocationCell,
    WeeklyPlannerGridRow,
    WeeklyCapacitySummary,
} from '@/types/weekly-allocation';

export const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;

export function cellKey(employeeId: string, projectId: string, weekStart: string): string {
    return `${employeeId}:${projectId}:${weekStart}`;
}

export function rowKey(employeeId: string, projectId: string): string {
    return `${employeeId}:${projectId}`;
}

/** Pivot flat API rows into AG Grid rows (employee × project). */
export function pivotGridRows(apiRows: WeeklyAllocationGridRow[]): WeeklyPlannerGridRow[] {
    const map = new Map<string, WeeklyPlannerGridRow>();

    for (const r of apiRows) {
        const key = rowKey(r.employeeId, r.projectId);
        let row = map.get(key);
        if (!row) {
            row = {
                rowKey: key,
                employeeId: r.employeeId,
                employeeName: r.employeeName?.trim() || r.employeeId,
                projectId: r.projectId,
                projectName: r.projectName?.trim() || 'Project',
                projectCode: r.projectCode?.trim() || '',
                weekCells: {},
            };
            map.set(key, row);
        }

        row.weekCells[r.weekStart] = {
            id: r.id.startsWith('legacy:') ? undefined : r.id,
            allocationId: r.allocationId,
            employeeId: r.employeeId,
            projectId: r.projectId,
            weekStart: r.weekStart,
            plannedHours: r.plannedHours,
            actualHours: r.actualHours,
            forecastHours: r.forecastHours,
            varianceHours:
                r.varianceHours ??
                Math.round((r.plannedHours - r.actualHours) * 100) / 100,
            deltaHours:
                r.deltaHours ??
                Math.round((r.actualHours - r.plannedHours) * 100) / 100,
            variancePercent: r.variancePercent,
            source: r.source,
            status: r.status,
            isLegacy: r.id.startsWith('legacy:'),
        };
    }

    return [...map.values()].sort((a, b) => {
        const e = a.employeeName.localeCompare(b.employeeName);
        if (e !== 0) return e;
        return a.projectName.localeCompare(b.projectName);
    });
}

/** Sum planned hours per employee per week across all project rows. */
export function computeEmployeeWeekTotals(
    rows: WeeklyPlannerGridRow[],
    weeks: string[]
): Map<string, number> {
    const totals = new Map<string, number>();
    for (const row of rows) {
        for (const week of weeks) {
            const hours = row.weekCells[week]?.plannedHours ?? 0;
            const empWeekKey = `${row.employeeId}:${week}`;
            totals.set(empWeekKey, (totals.get(empWeekKey) ?? 0) + hours);
        }
    }
    return totals;
}

export function buildCapacitySummariesFromRows(
    rows: WeeklyPlannerGridRow[],
    weeks: string[],
    capacityHours = DEFAULT_WEEKLY_CAPACITY_HOURS
): WeeklyCapacitySummary[] {
    const byEmpWeek = new Map<string, WeeklyCapacitySummary>();

    for (const week of weeks) {
        for (const row of rows) {
            const key = `${row.employeeId}:${week}`;
            if (!byEmpWeek.has(key)) {
                byEmpWeek.set(key, {
                    employeeId: row.employeeId,
                    employeeName: row.employeeName,
                    weekStart: week,
                    capacityHours,
                    committedHours: 0,
                    availableHours: capacityHours,
                    utilizationPercent: 0,
                    benchPercent: 100,
                    isOverAllocated: false,
                    plannedHours: 0,
                    actualHours: 0,
                    forecastHours: 0,
                    varianceHours: 0,
                });
            }
        }
    }

    for (const row of rows) {
        for (const week of weeks) {
            const cell = row.weekCells[week];
            if (!cell) continue;
            const key = `${row.employeeId}:${week}`;
            const s = byEmpWeek.get(key)!;
            s.plannedHours += cell.plannedHours;
            s.actualHours += cell.actualHours;
            s.forecastHours += cell.forecastHours;
        }
    }

    for (const s of byEmpWeek.values()) {
        s.committedHours = Math.round(s.plannedHours * 100) / 100;
        s.availableHours = Math.max(0, Math.round((capacityHours - s.committedHours) * 100) / 100);
        s.utilizationPercent =
            capacityHours > 0
                ? Math.min(100, Math.round((s.committedHours / capacityHours) * 10000) / 100)
                : 0;
        s.benchPercent =
            capacityHours > 0
                ? Math.round((s.availableHours / capacityHours) * 10000) / 100
                : 0;
        s.isOverAllocated = s.committedHours > capacityHours + 0.001;
        s.varianceHours = Math.round((s.actualHours - s.plannedHours) * 100) / 100;
        s.planVarianceHours = Math.round((s.plannedHours - s.actualHours) * 100) / 100;
        s.deltaHours = s.varianceHours;
        s.actualUtilizationPercent =
            capacityHours > 0
                ? Math.min(100, Math.round((s.actualHours / capacityHours) * 10000) / 100)
                : 0;
        s.plannedUtilizationPercent =
            capacityHours > 0
                ? Math.min(100, Math.round((s.plannedHours / capacityHours) * 10000) / 100)
                : 0;
        s.variancePercent =
            s.plannedHours > 0
                ? Math.round(((s.actualHours - s.plannedHours) / s.plannedHours) * 10000) / 100
                : 0;
        s.forecastAccuracyPercent =
            s.forecastHours > 0
                ? Math.max(
                      0,
                      Math.round(
                          (1 -
                              Math.abs(s.forecastHours - s.actualHours) /
                                  Math.max(s.forecastHours, s.actualHours, 1)) *
                              10000
                      ) / 100
                  )
                : s.actualHours === 0
                  ? 100
                  : 0;
    }

    return [...byEmpWeek.values()].sort(
        (a, b) => b.committedHours - a.committedHours || a.weekStart.localeCompare(b.weekStart)
    );
}

export function filterPlannerRowsByUtilization(
    rows: WeeklyPlannerGridRow[],
    weeks: string[],
    filter: 'all' | 'over_allocated' | 'bench' | 'high_utilization',
    capacityHours = DEFAULT_WEEKLY_CAPACITY_HOURS
): WeeklyPlannerGridRow[] {
    if (filter === 'all') return rows;

    const totals = computeEmployeeWeekTotals(rows, weeks);
    const matchingEmployees = new Set<string>();

    for (const [empWeek, committed] of totals) {
        const [employeeId] = empWeek.split(':');
        const bench = Math.max(0, capacityHours - committed);
        const util = capacityHours > 0 ? (committed / capacityHours) * 100 : 0;

        if (filter === 'over_allocated' && committed > capacityHours) {
            matchingEmployees.add(employeeId);
        } else if (filter === 'bench' && bench >= 8) {
            matchingEmployees.add(employeeId);
        } else if (filter === 'high_utilization' && util >= 80 && committed <= capacityHours) {
            matchingEmployees.add(employeeId);
        }
    }

    return rows.filter((r) => matchingEmployees.has(r.employeeId));
}

export function clonePlannerRows(rows: WeeklyPlannerGridRow[]): WeeklyPlannerGridRow[] {
    return rows.map((r) => ({
        ...r,
        weekCells: Object.fromEntries(
            Object.entries(r.weekCells).map(([k, c]) => [k, { ...c }])
        ),
    }));
}
