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
import type { ExecutiveMetrics } from '@/lib/use-executive-metrics';
import type { UtilizationVarianceResponse } from '@/types/utilization';

const HEALTH_COLORS = {
    onTrack: '#22c55e',
    atRisk: '#f59e0b',
    critical: '#ef4444',
};

interface ExecutiveDashboardChartsProps {
    stats: ExecutiveMetrics;
    utilization?: UtilizationVarianceResponse | null;
}

export function ExecutiveDashboardCharts({ stats, utilization }: ExecutiveDashboardChartsProps) {
    const healthPie = useMemo(
        () => [
            { name: 'On track', value: stats.onTrack, key: 'onTrack' },
            { name: 'At risk', value: stats.atRisk, key: 'atRisk' },
            { name: 'Critical', value: stats.critical, key: 'critical' },
        ].filter((d) => d.value > 0),
        [stats]
    );

    const workforceBar = useMemo(() => {
        const allocated = Math.round(stats.totalEmployees * (stats.utilization / 100));
        const bench = stats.benchCount;
        const other = Math.max(0, stats.totalEmployees - allocated - bench);
        return [
            { name: 'Allocated', hours: allocated, fill: '#6366f1' },
            { name: 'Bench', hours: bench, fill: '#94a3b8' },
            { name: 'Other', hours: other, fill: '#cbd5e1' },
        ];
    }, [stats]);

    const planVsActual = useMemo(() => {
        const summary = utilization?.summary;
        if (!summary) {
            return [
                {
                    name: 'Organization',
                    planned: stats.planDeliveryPercent,
                    actual: stats.utilization,
                },
            ];
        }
        return [
            {
                name: 'This period',
                planned: Math.round(summary.totalPlannedHours),
                actual: Math.round(summary.totalActualHours),
                variance: Math.round(summary.totalVarianceHours),
            },
        ];
    }, [utilization, stats]);

    const topProjectVariance = useMemo(() => {
        const rows = utilization?.overrunProjects?.slice(0, 6) ?? [];
        return rows.map((r) => ({
            name: (r.projectName ?? r.projectCode ?? 'Project').slice(0, 20),
            planned: r.plannedHours,
            actual: r.actualHours,
            overrun: r.overrunHours,
        }));
    }, [utilization]);

    const confidenceBreakdown = useMemo(
        () => [
            { name: 'Plan delivery', value: stats.planDeliveryPercent, fill: '#6366f1' },
            {
                name: 'Risk adjustment',
                value: Math.max(0, 100 - stats.atRisk * 8 - stats.critical * 15),
                fill: '#22c55e',
            },
            { name: 'Utilization', value: Math.min(100, stats.utilization), fill: '#0ea5e9' },
        ],
        [stats]
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <AccessibleChart
                    title="Project health mix"
                    description={`${stats.activeProjects} active projects — delivery status snapshot`}
                    data={healthPie.map((d) => ({ status: d.name, count: d.value }))}
                    columns={[
                        { key: 'status', header: 'Status' },
                        { key: 'count', header: 'Projects' },
                    ]}
                >
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={healthPie}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={48}
                                    outerRadius={72}
                                    paddingAngle={2}
                                >
                                    {healthPie.map((entry) => (
                                        <Cell
                                            key={entry.key}
                                            fill={HEALTH_COLORS[entry.key as keyof typeof HEALTH_COLORS]}
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
                    title="Workforce snapshot"
                    description={`${stats.totalEmployees} active employees · ${stats.utilization}% avg utilization`}
                    data={workforceBar.map((d) => ({ category: d.name, people: d.hours }))}
                    columns={[
                        { key: 'category', header: 'Category' },
                        { key: 'people', header: 'People (est.)' },
                    ]}
                >
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workforceBar} layout="vertical" margin={{ left: 8, right: 16 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="hours" name="People" radius={[0, 4, 4, 0]}>
                                    {workforceBar.map((entry) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AccessibleChart>

                <AccessibleChart
                    title="Delivery confidence drivers"
                    description={`Composite score: ${stats.deliveryConfidence}%`}
                    data={confidenceBreakdown.map((d) => ({
                        factor: d.name,
                        score: d.value,
                    }))}
                    columns={[
                        { key: 'factor', header: 'Factor' },
                        { key: 'score', header: 'Score' },
                    ]}
                >
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={confidenceBreakdown} margin={{ top: 8, right: 8, left: -8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={48} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {confidenceBreakdown.map((entry) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AccessibleChart>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <AccessibleChart
                    title="Planned vs actual hours"
                    description="Organization-wide hours in the selected period"
                    data={planVsActual.map((d) => ({
                        period: d.name,
                        planned: 'planned' in d && typeof d.planned === 'number' ? `${d.planned}h` : `${d.planned}%`,
                        actual: 'actual' in d && typeof d.actual === 'number' ? `${d.actual}h` : `${d.actual}%`,
                    }))}
                    columns={[
                        { key: 'period', header: 'Period' },
                        { key: 'planned', header: 'Planned' },
                        { key: 'actual', header: 'Actual' },
                    ]}
                >
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={planVsActual} margin={{ top: 8, right: 8, left: -8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="planned" name="Planned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </AccessibleChart>

                {topProjectVariance.length > 0 && (
                    <AccessibleChart
                        title="Projects over plan"
                        description="Actual hours exceeding planned in the period"
                        data={topProjectVariance.map((r) => ({
                            project: r.name,
                            overrun: `${r.overrun}h`,
                        }))}
                        columns={[
                            { key: 'project', header: 'Project' },
                            { key: 'overrun', header: 'Overrun' },
                        ]}
                    >
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProjectVariance} margin={{ top: 8, right: 8, left: -8 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={52} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="planned" name="Planned h" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="actual" name="Actual h" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AccessibleChart>
                )}
            </div>
        </div>
    );
}
