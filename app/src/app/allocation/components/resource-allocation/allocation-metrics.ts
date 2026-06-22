import {
    computeEmployeeWeekTotals,
    DEFAULT_WEEKLY_CAPACITY_HOURS,
} from '@/lib/weekly-grid-pivot';
import type { WeeklyCapacitySummary } from '@/types/weekly-allocation';
import type { AllocationGridRow } from '../allocation-weekly-grid';
import type { AIInsight, AllocationMetrics, UtilizationStatus } from './types';

export function computeAllocationMetrics(
    rows: AllocationGridRow[],
    weeks: string[],
    capacitySummary: WeeklyCapacitySummary[]
): AllocationMetrics {
    const projectIds = new Set(rows.map((r) => r.projectId).filter(Boolean));
    const employeeIds = new Set(rows.map((r) => r.employeeId).filter(Boolean));

    let totalAllocatedHours = 0;
    for (const row of rows) {
        for (const week of weeks) {
            totalAllocatedHours += row.weekCells[week]?.plannedHours ?? 0;
        }
    }

    const summariesForWeeks = capacitySummary.filter((s) => weeks.includes(s.weekStart));
    const overCapacityEmployees = new Set(
        summariesForWeeks.filter((s) => s.isOverAllocated).map((s) => s.employeeId)
    );

    const avgUtil =
        summariesForWeeks.length > 0
            ? summariesForWeeks.reduce((acc, s) => acc + s.utilizationPercent, 0) /
              summariesForWeeks.length
            : 0;

    return {
        projectCount: projectIds.size,
        resourceCount: employeeIds.size,
        allocatedHours: Math.round(totalAllocatedHours),
        utilizationPercent: Math.round(avgUtil),
        overCapacityCount: overCapacityEmployees.size,
    };
}

export function utilizationStatusFromPercent(percent: number, isOver = false): UtilizationStatus {
    if (isOver || percent > 100) return 'overloaded';
    if (percent >= 85) return 'high';
    if (percent >= 50) return 'optimal';
    if (percent <= 0) return 'available';
    return 'optimal';
}

export function employeeWeekUtilization(
    employeeId: string,
    week: string,
    rows: AllocationGridRow[],
    weeks: string[]
): { hours: number; percent: number; isOver: boolean } {
    const totals = computeEmployeeWeekTotals(rows, weeks);
    const hours = totals.get(`${employeeId}:${week}`) ?? 0;
    const percent = Math.round((hours / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100);
    return {
        hours,
        percent,
        isOver: hours > DEFAULT_WEEKLY_CAPACITY_HOURS + 0.001,
    };
}

export function buildHeatmapCells(
    rows: AllocationGridRow[],
    weeks: string[]
): { employeeId: string; projectId: string; percent: number }[] {
    const empTotals = new Map<string, number>();
    const cells: { employeeId: string; projectId: string; hours: number }[] = [];

    for (const row of rows) {
        if (!row.employeeId || !row.projectId) continue;
        let rowHours = 0;
        for (const week of weeks) {
            rowHours += row.weekCells[week]?.plannedHours ?? 0;
        }
        if (rowHours <= 0) continue;
        cells.push({ employeeId: row.employeeId, projectId: row.projectId, hours: rowHours });
        empTotals.set(row.employeeId, (empTotals.get(row.employeeId) ?? 0) + rowHours);
    }

    return cells.map((c) => {
        const total = empTotals.get(c.employeeId) ?? c.hours;
        const percent = total > 0 ? Math.round((c.hours / total) * 100) : 0;
        return { employeeId: c.employeeId, projectId: c.projectId, percent };
    });
}

export function deriveAIInsights(
    rows: AllocationGridRow[],
    weeks: string[],
    capacitySummary: WeeklyCapacitySummary[],
    employeeRoles: Map<string, string>
): AIInsight[] {
    const insights: AIInsight[] = [];

    const overNext = new Set(
        capacitySummary
            .filter((s) => weeks.includes(s.weekStart) && s.isOverAllocated)
            .map((s) => s.employeeId)
    );

    if (overNext.size > 0) {
        insights.push({
            id: 'capacity-risk',
            type: 'risk',
            title: 'Capacity Risk',
            description: `${overNext.size} engineer${overNext.size === 1 ? '' : 's'} may exceed capacity in the selected period.`,
            actionLabel: 'Review overloaded',
        });
    }

    const skillCounts = new Map<string, number>();
    for (const row of rows) {
        const role = employeeRoles.get(row.employeeId ?? '') ?? row.employeeRole ?? '';
        if (role && role !== '—') {
            skillCounts.set(role, (skillCounts.get(role) ?? 0) + 1);
        }
    }

    const understaffedProjects = new Set(
        rows.filter((r) => !r.employeeId).map((r) => r.projectId)
    );
    if (understaffedProjects.size > 0) {
        insights.push({
            id: 'staffing-gap',
            type: 'skill-gap',
            title: 'Staffing Gap',
            description: `${understaffedProjects.size} project${understaffedProjects.size === 1 ? '' : 's'} have unassigned allocation rows.`,
            actionLabel: 'Review unstaffed',
        });
    }

    const overloaded = capacitySummary.find(
        (s) => weeks.includes(s.weekStart) && s.isOverAllocated
    );
    const underutilized = capacitySummary.find(
        (s) =>
            weeks.includes(s.weekStart) &&
            !s.isOverAllocated &&
            s.utilizationPercent < 50 &&
            s.plannedHours > 0
    );

    if (overloaded && underutilized) {
        insights.push({
            id: 'rebalance',
            type: 'optimization',
            title: 'Optimization',
            description: `Consider rebalancing hours from ${overloaded.employeeName} to lighter-loaded resources to reduce delivery risk.`,
            actionLabel: 'Apply recommendation',
        });
    }

    if (insights.length === 0) {
        insights.push({
            id: 'healthy',
            type: 'optimization',
            title: 'Capacity looks healthy',
            description: 'No critical overload detected in the current planning window.',
        });
    }

    return insights;
}

export function exportRowsToCsv(rows: AllocationGridRow[], weeks: string[]): void {
    const headers = ['Employee', 'Role', 'Project', 'Project Code', ...weeks.map((w) => `Week ${w}`)];
    const lines = [headers.join(',')];

    for (const row of rows) {
        const weekVals = weeks.map((w) => String(row.weekCells[w]?.plannedHours ?? 0));
        const cells = [
            `"${row.employeeName.replace(/"/g, '""')}"`,
            `"${(row.employeeRole ?? '').replace(/"/g, '""')}"`,
            `"${row.projectName.replace(/"/g, '""')}"`,
            `"${row.projectCode.replace(/"/g, '""')}"`,
            ...weekVals,
        ];
        lines.push(cells.join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-allocation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
