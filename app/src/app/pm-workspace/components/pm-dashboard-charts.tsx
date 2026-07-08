import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AccessibleChart } from '@/components/patterns/accessible-chart';
import type { PmProjectHoursRow, PmStatusBreakdown } from '@/lib/pm-dashboard-metrics';
import { statusBreakdownChartData } from '@/lib/pm-dashboard-metrics';

const STATUS_COLORS: Record<string, string> = {
    Active: '#22c55e',
    Proposal: '#6366f1',
    OnHold: '#f59e0b',
    Completed: '#94a3b8',
    ProposalLost: '#ef4444',
};

interface PmDashboardChartsProps {
    statusBreakdown: PmStatusBreakdown;
    projectHours: PmProjectHoursRow[];
    plannedHoursWeek: number;
    actualHoursWeek: number;
}

export function PmDashboardCharts({
    statusBreakdown,
    projectHours,
    plannedHoursWeek,
    actualHoursWeek,
}: PmDashboardChartsProps) {
    const statusData = useMemo(() => statusBreakdownChartData(statusBreakdown), [statusBreakdown]);

    const portfolioHoursData = useMemo(
        () => [
            { name: 'Planned', hours: Math.round(plannedHoursWeek) },
            { name: 'Actual', hours: Math.round(actualHoursWeek) },
        ],
        [plannedHoursWeek, actualHoursWeek]
    );

    const projectBars = useMemo(
        () =>
            [...projectHours]
                .filter((p) => p.plannedHours > 0 || p.actualHours > 0)
                .slice(0, 8)
                .map((p) => ({
                    name: p.projectName.length > 16 ? `${p.projectName.slice(0, 14)}…` : p.projectName,
                    fullName: p.projectName,
                    planned: Math.round(p.plannedHours),
                    actual: Math.round(p.actualHours),
                })),
        [projectHours]
    );

    if (statusData.length === 0 && projectBars.length === 0) {
        return (
            <p className="text-sm text-muted-foreground dashboard-card p-6">
                No chart data yet — assign projects and log planner hours to see delivery visuals.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AccessibleChart
                title="My project status mix"
                description="How your assigned projects break down by lifecycle status"
                data={statusData}
                columns={[
                    { key: 'name', header: 'Status' },
                    { key: 'value', header: 'Projects' },
                ]}
            >
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={80}
                                paddingAngle={2}
                            >
                                {statusData.map((entry) => (
                                    <Cell
                                        key={entry.key}
                                        fill={STATUS_COLORS[entry.key] ?? '#94a3b8'}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </AccessibleChart>

            <AccessibleChart
                title="Portfolio hours this week"
                description="Total planned vs actual across your projects"
                data={portfolioHoursData}
                columns={[
                    { key: 'name', header: 'Type' },
                    { key: 'hours', header: 'Hours' },
                ]}
            >
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={portfolioHoursData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="hours" name="Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </AccessibleChart>

            {projectBars.length > 0 && (
                <AccessibleChart
                    title="Plan vs actual by project"
                    description="Top projects by planned hours this week"
                    data={projectBars}
                    columns={[
                        { key: 'fullName', header: 'Project' },
                        { key: 'planned', header: 'Planned (h)' },
                        { key: 'actual', header: 'Actual (h)' },
                    ]}
                    className="xl:col-span-2"
                >
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectBars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="planned" name="Planned h" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="actual" name="Actual h" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AccessibleChart>
            )}
        </div>
    );
}
