import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';
import type { AllocationGridRow } from '../allocation-weekly-grid';
import { AllocationCell } from './AllocationCell';
import { employeeWeekUtilization, utilizationStatusFromPercent } from './allocation-metrics';
import { StatusBadge } from './StatusBadge';

interface TimelinePlannerProps {
    rows: AllocationGridRow[];
    weeks: string[];
    loading?: boolean;
}

interface EmployeeTimeline {
    employeeId: string;
    name: string;
    role: string;
    projects: { name: string; percent: number }[];
    avgUtil: number;
    status: ReturnType<typeof utilizationStatusFromPercent>;
}

export function TimelinePlanner({ rows, weeks, loading }: TimelinePlannerProps) {
    const [hoverKey, setHoverKey] = useState<string | null>(null);

    const employees = useMemo((): EmployeeTimeline[] => {
        const byEmp = new Map<string, AllocationGridRow[]>();
        for (const row of rows) {
            if (!row.employeeId) continue;
            const list = byEmp.get(row.employeeId) ?? [];
            list.push(row);
            byEmp.set(row.employeeId, list);
        }

        const result: EmployeeTimeline[] = [];
        for (const [employeeId, empRows] of byEmp) {
            const first = empRows[0];
            let totalHours = 0;
            const projectHours = new Map<string, { name: string; hours: number }>();

            for (const row of empRows) {
                let rowH = 0;
                for (const week of weeks) {
                    rowH += row.weekCells[week]?.plannedHours ?? 0;
                }
                totalHours += rowH;
                if (rowH > 0) {
                    projectHours.set(row.projectId, {
                        name: row.projectName,
                        hours: (projectHours.get(row.projectId)?.hours ?? 0) + rowH,
                    });
                }
            }

            const weekCount = Math.max(weeks.length, 1);
            const avgHours = totalHours / weekCount;
            const avgUtil = Math.round((avgHours / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100);

            const projects = [...projectHours.values()]
                .map((p) => ({
                    name: p.name,
                    percent: totalHours > 0 ? Math.round((p.hours / totalHours) * 100) : 0,
                }))
                .sort((a, b) => b.percent - a.percent);

            result.push({
                employeeId,
                name: first.employeeName,
                role: first.employeeRole ?? '—',
                projects,
                avgUtil,
                status: utilizationStatusFromPercent(avgUtil),
            });
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [rows, weeks]);

    if (loading) {
        return (
            <div className="dashboard-card overflow-hidden">
                <div className="h-96 animate-pulse bg-slate-50" />
            </div>
        );
    }

    if (employees.length === 0) {
        return (
            <div className="dashboard-card py-16 text-center">
                <p className="text-sm font-medium text-slate-700">No resources to display</p>
                <p className="text-xs text-slate-500 mt-1">
                    Adjust filters or add allocations to begin planning.
                </p>
            </div>
        );
    }

    return (
        <div className="dashboard-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                            <th className="sticky left-0 z-10 bg-slate-50/95 backdrop-blur px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 min-w-[200px]">
                                Employee
                            </th>
                            {weeks.map((week) => (
                                <th
                                    key={week}
                                    className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 min-w-[120px]"
                                >
                                    {format(parseISO(week), 'MMM d')}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.employeeId} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-slate-100">
                                    <p className="font-medium text-slate-900">{emp.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{emp.role}</p>
                                </td>
                                {weeks.map((week) => {
                                    const util = employeeWeekUtilization(
                                        emp.employeeId,
                                        week,
                                        rows,
                                        weeks
                                    );
                                    const status = utilizationStatusFromPercent(
                                        util.percent,
                                        util.isOver
                                    );
                                    const key = `${emp.employeeId}:${week}`;
                                    return (
                                        <td
                                            key={week}
                                            className="px-3 py-3 relative"
                                            onMouseEnter={() => setHoverKey(key)}
                                            onMouseLeave={() => setHoverKey(null)}
                                        >
                                            <AllocationCell
                                                percent={util.percent}
                                                status={status}
                                                hours={util.hours}
                                                compact
                                            />
                                            <p className="text-[10px] font-medium text-slate-600 mt-1 tabular-nums">
                                                {util.percent}%
                                            </p>
                                            {hoverKey === key && (
                                                <TimelinePopover
                                                    name={emp.name}
                                                    role={emp.role}
                                                    projects={emp.projects}
                                                    hours={util.hours}
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3">
                                    <StatusBadge status={emp.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TimelinePopover({
    name,
    role,
    projects,
    hours,
}: {
    name: string;
    role: string;
    projects: { name: string; percent: number }[];
    hours: number;
}) {
    return (
        <div className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-left pointer-events-none">
            <p className="text-xs font-semibold text-slate-900">{name}</p>
            <p className="text-[11px] text-slate-500">{role}</p>
            {projects.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                    {projects.map((p) => (
                        <li key={p.name} className="flex justify-between text-[11px] text-slate-600">
                            <span className="truncate pr-2">{p.name}</span>
                            <span className="font-medium tabular-nums">{p.percent}%</span>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-2 text-[11px] font-medium text-indigo-600 tabular-nums">
                Capacity: {hours}/{DEFAULT_WEEKLY_CAPACITY_HOURS} hrs
            </p>
        </div>
    );
}
