import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AccessibleChart } from '@/components/patterns/accessible-chart';

export interface TeamWorkloadRow {
    employeeId: string;
    employeeName: string;
    plannedHours: number;
    actualHours: number;
    utilizationPercent: number;
}

interface TeamWorkloadChartProps {
    rows: TeamWorkloadRow[];
    loading?: boolean;
}

export function TeamWorkloadChart({ rows, loading }: TeamWorkloadChartProps) {
    const chartData = useMemo(
        () =>
            [...rows]
                .sort((a, b) => b.plannedHours - a.plannedHours)
                .slice(0, 10)
                .map((r) => ({
                    name: r.employeeName.length > 14 ? `${r.employeeName.slice(0, 12)}…` : r.employeeName,
                    planned: Math.round(r.plannedHours),
                    actual: Math.round(r.actualHours),
                    utilization: r.utilizationPercent,
                })),
        [rows]
    );

    const tableData = useMemo(
        () =>
            rows.map((r) => ({
                employee: r.employeeName,
                planned: `${Math.round(r.plannedHours)}h`,
                actual: `${Math.round(r.actualHours)}h`,
                utilization: `${r.utilizationPercent}%`,
            })),
        [rows]
    );

    if (loading) {
        return <div className="dashboard-card h-48 enterprise-skeleton" role="status" aria-label="Loading team workload" />;
    }

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground dashboard-card p-6">
                No team workload data for this week.
            </p>
        );
    }

    return (
        <AccessibleChart
            title="Team workload this week"
            description="Planned vs actual hours per team member"
            data={tableData}
            columns={[
                { key: 'employee', header: 'Team member' },
                { key: 'planned', header: 'Planned' },
                { key: 'actual', header: 'Actual' },
                { key: 'utilization', header: 'Utilization' },
            ]}
        >
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="planned" name="Planned h" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" name="Actual h" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </AccessibleChart>
    );
}

/** Aggregate utilization variance rows by employee for PM team view */
export function aggregateTeamWorkload(
    varianceRows: {
        employeeId: string;
        employeeName?: string;
        plannedHours: number;
        actualHours: number;
    }[]
): TeamWorkloadRow[] {
    const byEmployee = new Map<string, TeamWorkloadRow>();

    for (const row of varianceRows) {
        const cur = byEmployee.get(row.employeeId) ?? {
            employeeId: row.employeeId,
            employeeName: row.employeeName ?? 'Unknown',
            plannedHours: 0,
            actualHours: 0,
            utilizationPercent: 0,
        };
        cur.plannedHours += row.plannedHours;
        cur.actualHours += row.actualHours;
        byEmployee.set(row.employeeId, cur);
    }

    return [...byEmployee.values()].map((r) => ({
        ...r,
        utilizationPercent:
            r.plannedHours > 0
                ? Math.min(999, Math.round((r.actualHours / r.plannedHours) * 100))
                : 0,
    }));
}
