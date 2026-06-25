import { useMemo, useState } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    Cell,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Download, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardCard, DashboardSectionHeader } from './DashboardCard';
import type { UtilizationTrendPoint } from '@/lib/utilization-trend';

export type { UtilizationTrendPoint };

export interface AllocationDistribution {
    name: string;
    value: number;
    color: string;
}

interface UtilizationAnalyticsProps {
    trendData: UtilizationTrendPoint[];
    distribution: AllocationDistribution[];
    loading?: boolean;
    onExport?: () => void;
}

const DONUT_COLORS = ['#4f46e5', '#64748b', '#94a3b8', '#cbd5e1'];

type ChartMode = 'percent' | 'hours';

function TrendTooltip({
    active,
    payload,
    mode,
}: {
    active?: boolean;
    payload?: { payload: UtilizationTrendPoint }[];
    mode: ChartMode;
}) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs min-w-[200px]">
            <p className="font-semibold text-slate-900 mb-2">Week of {point.weekLabel}</p>
            {mode === 'percent' ? (
                <>
                    <p className="text-indigo-700">
                        <span className="font-medium">Planned:</span> {point.plannedUtilization}% avg per person
                    </p>
                    <p className="text-emerald-700 mt-1">
                        <span className="font-medium">Logged:</span> {point.actualUtilization}% avg per person
                    </p>
                    <p className="text-slate-600 mt-2 pt-2 border-t border-slate-100">
                        Gap: {point.utilizationGap > 0 ? '+' : ''}
                        {point.utilizationGap} pts (logged vs plan)
                    </p>
                </>
            ) : (
                <>
                    <p className="text-indigo-700">
                        <span className="font-medium">Planned:</span> {point.plannedHours}h across team
                    </p>
                    <p className="text-emerald-700 mt-1">
                        <span className="font-medium">Logged:</span> {point.actualHours}h across team
                    </p>
                </>
            )}
            <p className="text-slate-500 mt-2">{point.employeeCount} people with planner data</p>
        </div>
    );
}

function SummaryChip({
    label,
    value,
    sub,
    tone,
}: {
    label: string;
    value: string;
    sub?: string;
    tone: 'indigo' | 'emerald' | 'slate' | 'amber';
}) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-800 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100',
        amber: 'bg-amber-50 text-amber-800 border-amber-100',
    };
    return (
        <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
            {sub && <p className="text-[11px] mt-0.5 opacity-90">{sub}</p>}
        </div>
    );
}

export function UtilizationAnalytics({
    trendData,
    distribution,
    loading,
    onExport,
}: UtilizationAnalyticsProps) {
    const [mode, setMode] = useState<ChartMode>('percent');

    const totalDist = useMemo(
        () => distribution.reduce((s, d) => s + d.value, 0),
        [distribution]
    );

    const summary = useMemo(() => {
        if (trendData.length === 0) return null;
        const latest = trendData[trendData.length - 1];
        const prev = trendData.length > 1 ? trendData[trendData.length - 2] : null;
        const avgPlanned =
            Math.round(
                (trendData.reduce((s, p) => s + p.plannedUtilization, 0) / trendData.length) * 10
            ) / 10;
        const avgActual =
            Math.round(
                (trendData.reduce((s, p) => s + p.actualUtilization, 0) / trendData.length) * 10
            ) / 10;
        const delta = prev ? Math.round((latest.actualUtilization - prev.actualUtilization) * 10) / 10 : 0;
        return { latest, avgPlanned, avgActual, delta };
    }, [trendData]);

    const chartData = useMemo(
        () =>
            trendData.map((p) => ({
                ...p,
                planned: mode === 'percent' ? p.plannedUtilization : p.plannedHours,
                actual: mode === 'percent' ? p.actualUtilization : p.actualHours,
            })),
        [trendData, mode]
    );

    if (loading) {
        return (
            <DashboardCard>
                <div className="h-80 bg-slate-50 animate-pulse rounded-xl" />
            </DashboardCard>
        );
    }

    return (
        <section aria-labelledby="utilization-analytics-heading">
            <DashboardSectionHeader
                title="Workforce Utilization"
                description="Compare weekly planner commitments vs timesheet hours logged."
                action={
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setMode('percent')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    mode === 'percent'
                                        ? 'bg-white text-brand-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Utilization %
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('hours')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    mode === 'hours'
                                        ? 'bg-white text-brand-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Total hours
                            </button>
                        </div>
                        {onExport && (
                            <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
                                <Download className="w-3.5 h-3.5" />
                                Export
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <DashboardCard className="xl:col-span-2" padding="md">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div>
                            <h3 id="utilization-analytics-heading" className="text-sm font-semibold text-slate-900">
                                Utilization trend
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {mode === 'percent'
                                    ? 'Average % of a 40h week — planner (plan) vs timesheets (logged)'
                                    : 'Total team hours each week — planned vs logged'}
                            </p>
                        </div>
                        {summary && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                {summary.delta > 0.5 ? (
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                ) : summary.delta < -0.5 ? (
                                    <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                    <Minus className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                Latest week: {summary.latest.actualUtilization}% logged
                                {summary.delta !== 0 && (
                                    <span className="text-slate-400">
                                        ({summary.delta > 0 ? '+' : ''}
                                        {summary.delta} vs prior)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            <SummaryChip label="Avg planned" value={`${summary.avgPlanned}%`} tone="indigo" />
                            <SummaryChip label="Avg logged" value={`${summary.avgActual}%`} tone="emerald" />
                            <SummaryChip
                                label="Latest plan"
                                value={`${summary.latest.plannedUtilization}%`}
                                sub={`${summary.latest.plannedHours}h team`}
                                tone="slate"
                            />
                            <SummaryChip
                                label="Plan vs logged"
                                value={`${summary.latest.utilizationGap > 0 ? '+' : ''}${summary.latest.utilizationGap} pts`}
                                sub={
                                    summary.latest.utilizationGap < -5
                                        ? 'Under plan'
                                        : summary.latest.utilizationGap > 5
                                          ? 'Over plan'
                                          : 'On track'
                                }
                                tone={Math.abs(summary.latest.utilizationGap) > 10 ? 'amber' : 'slate'}
                            />
                        </div>
                    )}

                    {chartData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center px-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-sm font-medium text-slate-700">No utilization history yet</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                Appears after teams use the weekly planner and log time entries.
                            </p>
                        </div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="plannedFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#059669" stopOpacity={0.18} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="weekLabel"
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        unit={mode === 'percent' ? '%' : 'h'}
                                        domain={mode === 'percent' ? [0, 100] : ['auto', 'auto']}
                                    />
                                    {mode === 'percent' && (
                                        <ReferenceLine
                                            y={100}
                                            stroke="#94a3b8"
                                            strokeDasharray="4 4"
                                            label={{
                                                value: '100% capacity',
                                                position: 'insideTopRight',
                                                fontSize: 10,
                                                fill: '#94a3b8',
                                            }}
                                        />
                                    )}
                                    <Tooltip content={<TrendTooltip mode={mode} />} />
                                    <Legend
                                        verticalAlign="top"
                                        height={28}
                                        iconType="circle"
                                        formatter={(value) => (
                                            <span className="text-xs text-slate-600">{value}</span>
                                        )}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="planned"
                                        stroke="none"
                                        fill="url(#plannedFill)"
                                        legendType="none"
                                        tooltipType="none"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="actual"
                                        stroke="none"
                                        fill="url(#actualFill)"
                                        legendType="none"
                                        tooltipType="none"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="planned"
                                        name={mode === 'percent' ? 'Planned utilization' : 'Planned hours'}
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#6366f1' }}
                                        activeDot={{ r: 5 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="actual"
                                        name={mode === 'percent' ? 'Logged utilization' : 'Logged hours'}
                                        stroke="#059669"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#059669' }}
                                        activeDot={{ r: 5 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </DashboardCard>

                <DashboardCard padding="md">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Allocation distribution</h3>
                    <p className="text-xs text-slate-500 mb-4">Workforce allocation mix this period</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={52}
                                    outerRadius={72}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {distribution.map((entry, i) => (
                                        <Cell key={entry.name} fill={entry.color ?? DONUT_COLORS[i % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    formatter={(value) => (
                                        <span className="text-xs text-slate-600">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {totalDist > 0 && (
                        <p className="text-center text-xs text-slate-500 mt-2">
                            {totalDist} resources categorized
                        </p>
                    )}
                </DashboardCard>
            </div>
        </section>
    );
}
