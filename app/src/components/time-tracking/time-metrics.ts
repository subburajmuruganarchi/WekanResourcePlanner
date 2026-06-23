import type { DayData, ProjectOption } from '@/components/time-entry/time-entry-types';
import type { TimeKPIs, TimeSuggestion, GridRow, TimesheetStatus } from './types';

export const WEEKLY_CAPACITY_HOURS = 40;

export function computeTimeKPIs(
    weekData: DayData[],
    weekTimesheetStatus: TimesheetStatus
): TimeKPIs {
    const loggedHours = weekData.reduce(
        (sum, day) => sum + day.entries.reduce((d, e) => d + (Number(e.hours) || 0), 0),
        0
    );
    const projectCodes = new Set(
        weekData.flatMap((d) => d.entries.filter((e) => e.hours > 0).map((e) => e.projectCode))
    );

    const approvalLabel =
        weekTimesheetStatus === 'approved'
            ? 'Approved'
            : weekTimesheetStatus === 'submitted'
              ? 'Pending'
              : weekTimesheetStatus === 'rejected'
                ? 'Rejected'
                : 'Draft';

    return {
        weeklyCapacity: WEEKLY_CAPACITY_HOURS,
        loggedHours: Math.round(loggedHours * 10) / 10,
        remainingHours: Math.max(0, Math.round((WEEKLY_CAPACITY_HOURS - loggedHours) * 10) / 10),
        utilizationPercent:
            WEEKLY_CAPACITY_HOURS > 0
                ? Math.min(100, Math.round((loggedHours / WEEKLY_CAPACITY_HOURS) * 100))
                : 0,
        projectsWorked: projectCodes.size,
        approvalLabel,
    };
}

export function deriveTimeSuggestions(
    weekData: DayData[],
    missingWeekdays: string[],
    allocationEstimates?: {
        byProject: { projectName: string; estimatedHours: number; percentage: number }[];
    } | null
): TimeSuggestion[] {
    const suggestions: TimeSuggestion[] = [];
    const logged = computeTimeKPIs(weekData, 'draft').loggedHours;
    const remaining = WEEKLY_CAPACITY_HOURS - logged;

    if (remaining > 0 && missingWeekdays.length > 0) {
        suggestions.push({
            id: 'missing-hours',
            message: `${missingWeekdays.length} weekday${missingWeekdays.length === 1 ? '' : 's'} need time entries (${remaining}h remaining to reach 40h).`,
            actionLabel: 'Fill missing days',
        });
    }

    const topProject = allocationEstimates?.byProject[0];
    if (topProject) {
        const mondayIndex = weekData.findIndex((d) => d.isWeekday);
        if (mondayIndex >= 0) {
            const mondayHours =
                weekData[mondayIndex].entries
                    .filter((e) => e.projectCode)
                    .reduce((s, e) => s + e.hours, 0) || 0;
            if (mondayHours < topProject.estimatedHours / 5) {
                suggestions.push({
                    id: 'monday-suggest',
                    message: `Based on allocations, ${topProject.projectName} typically needs ~${Math.round(topProject.estimatedHours / 5)}h on weekdays.`,
                    actionLabel: 'Apply suggestion',
                    dayIndex: mondayIndex,
                    hours: Math.round((topProject.estimatedHours / 5) * 10) / 10,
                });
            }
        }
    }

    if (suggestions.length === 0) {
        suggestions.push({
            id: 'on-track',
            message: 'Your timesheet looks on track for this week. Keep logging daily for accurate utilization.',
        });
    }

    return suggestions;
}

export function flattenToGridRows(
    weekData: DayData[],
    projects: ProjectOption[],
    employeeName: string
): GridRow[] {
    const rows: GridRow[] = [];
    for (const day of weekData) {
        for (const entry of day.entries) {
            if (!entry.projectCode && entry.hours <= 0) continue;
            const project = projects.find((p) => p.code === entry.projectCode);
            rows.push({
                id: entry.tempId,
                employee: employeeName,
                project: project?.name ?? entry.projectCode,
                projectCode: entry.projectCode,
                task: entry.comments || '—',
                date: day.fullDate,
                dayLabel: day.day,
                hours: entry.hours,
                status: entry.status || 'Draft',
            });
        }
    }
    return rows;
}

export function exportTimesheetCsv(rows: GridRow[]): void {
    const headers = ['Employee', 'Project', 'Task', 'Date', 'Hours', 'Status'];
    const lines = [
        headers.join(','),
        ...rows.map((r) =>
            [
                `"${r.employee.replace(/"/g, '""')}"`,
                `"${r.project.replace(/"/g, '""')}"`,
                `"${r.task.replace(/"/g, '""')}"`,
                r.date,
                String(r.hours),
                r.status,
            ].join(',')
        ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
