import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AccessibleChart } from '@/components/patterns/accessible-chart';
import type { EmployeeProjectRow } from '@/lib/employee-dashboard-metrics';

interface EmployeeWorkspaceChartsProps {
    projectRows: EmployeeProjectRow[];
    plannedHours: number;
    actualHours: number;
}

export function EmployeeWorkspaceCharts({
    projectRows,
    plannedHours,
    actualHours,
}: EmployeeWorkspaceChartsProps) {
    const weekSummary = useMemo(
        () => [
            { name: 'Planned', hours: Math.round(plannedHours) },
            { name: 'Actual', hours: Math.round(actualHours) },
        ],
        [plannedHours, actualHours]
    );

    const projectBars = useMemo(
        () =>
            projectRows
                .filter((p) => p.plannedHours > 0 || p.actualHours > 0)
                .slice(0, 8)
                .map((p) => ({
                    name: p.projectName.length > 16 ? `${p.projectName.slice(0, 14)}…` : p.projectName,
                    fullName: p.projectName,
                    planned: Math.round(p.plannedHours),
                    actual: Math.round(p.actualHours),
                })),
        [projectRows]
    );

    if (weekSummary.every((d) => d.hours === 0) && projectBars.length === 0) {
        return (
            <p className="text-sm text-muted-foreground dashboard-card p-6">
                No weekly plan data yet — your PM will add allocations in the resource planner.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AccessibleChart
                title="This week — plan vs actual"
                description="Your total planned and actual hours for the current week"
                data={weekSummary}
                columns={[
                    { key: 'name', header: 'Type' },
                    { key: 'hours', header: 'Hours' },
                ]}
            >
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weekSummary} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="hours" name="Hours" fill="hsl(var(--brand-600))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </AccessibleChart>

            {projectBars.length > 0 ? (
                <AccessibleChart
                    title="Hours by project"
                    description="Planned vs actual hours per assigned project this week"
                    data={projectBars}
                    columns={[
                        { key: 'fullName', header: 'Project' },
                        { key: 'planned', header: 'Planned' },
                        { key: 'actual', header: 'Actual' },
                    ]}
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={projectBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value, name) => [`${value ?? 0}h`, String(name)]}
                                labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.fullName ?? ''
                                }
                            />
                            <Legend />
                            <Bar dataKey="planned" name="Planned" fill="#6366f1" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="actual" name="Actual" fill="#22c55e" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </AccessibleChart>
            ) : (
                <div className="dashboard-card p-6 text-sm text-muted-foreground">
                    Project-level hours will appear once you are allocated in the weekly planner.
                </div>
            )}
        </div>
    );
}
