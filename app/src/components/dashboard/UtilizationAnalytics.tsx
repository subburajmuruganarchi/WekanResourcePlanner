import { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardCard, DashboardSectionHeader } from './DashboardCard';

export interface UtilizationTrendPoint {
    week: string;
    planned: number;
    actual: number;
}

export interface AllocationDistribution {
    name: string;
    value: number;
    color: string;
}

interface UtilizationAnalyticsProps {
    trendData: UtilizationTrendPoint[];
    distribution: AllocationDistribution[];
    forecastData: { month: string; capacity: number }[];
    loading?: boolean;
    onExport?: () => void;
}

const DONUT_COLORS = ['#4f46e5', '#64748b', '#94a3b8', '#cbd5e1'];

export function UtilizationAnalytics({
    trendData,
    distribution,
    forecastData,
    loading,
    onExport,
}: UtilizationAnalyticsProps) {
    const [view, setView] = useState<'12w' | '90d'>('12w');

    const totalDist = useMemo(
        () => distribution.reduce((s, d) => s + d.value, 0),
        [distribution]
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
                description="Planned vs actual utilization, allocation mix, and forward capacity outlook."
                action={
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setView('12w')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    view === '12w'
                                        ? 'bg-white text-brand-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                12 weeks
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('90d')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    view === '90d'
                                        ? 'bg-white text-brand-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                90 days
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
                    <h3 id="utilization-analytics-heading" className="text-sm font-semibold text-[#111827] mb-4">
                        Utilization trend
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={view === '12w' ? trendData : forecastData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey={view === '12w' ? 'week' : 'month'}
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit="%"
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        fontSize: 12,
                                    }}
                                />
                                {view === '12w' ? (
                                    <>
                                        <Line
                                            type="monotone"
                                            dataKey="planned"
                                            name="Planned"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="actual"
                                            name="Actual"
                                            stroke="#059669"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </>
                                ) : (
                                    <Line
                                        type="monotone"
                                        dataKey="capacity"
                                        name="Forecast capacity %"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>

                <DashboardCard padding="md">
                    <h3 className="text-sm font-semibold text-[#111827] mb-2">Allocation distribution</h3>
                    <p className="text-xs text-[#64748b] mb-4">Billable vs non-billable vs bench</p>
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
