import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import type { EmployeeWeeklyHoursPoint } from '@/lib/utilization-trend';
import { WEEKLY_CAPACITY_HOURS } from '@/lib/utilization-trend';

interface EmployeeUtilizationTrendChartProps {
    points: EmployeeWeeklyHoursPoint[];
    loading?: boolean;
    capacityHours?: number;
}

function barColor(point: EmployeeWeeklyHoursPoint, capacity: number): string {
    if (point.isCurrentWeek) return '#4f46e5';
    if (point.hours >= capacity) return '#059669';
    if (point.hours >= capacity * 0.75) return '#6366f1';
    return '#cbd5e1';
}

function HoursTooltip({
    active,
    payload,
    capacityHours,
}: {
    active?: boolean;
    payload?: { payload: EmployeeWeeklyHoursPoint }[];
    capacityHours: number;
}) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const remaining = Math.max(0, Math.round((capacityHours - p.hours) * 10) / 10);

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold text-slate-900">Week of {p.weekLabel}</p>
            <p className="text-brand-700 mt-1">
                <span className="font-medium">Logged:</span> {p.hours}h ({p.utilizationPercent}%)
            </p>
            <p className="text-slate-600 mt-1">
                Target: {capacityHours}h / week
                {remaining > 0
                    ? ` · ${remaining}h remaining`
                    : p.hours > capacityHours
                      ? ' · over capacity'
                      : ' · at target'}
            </p>
        </div>
    );
}

export function EmployeeUtilizationTrendChart({
    points,
    loading,
    capacityHours = WEEKLY_CAPACITY_HOURS,
}: EmployeeUtilizationTrendChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading trend…
            </div>
        );
    }

    if (points.length === 0) {
        return (
            <p className="text-xs text-slate-500 py-6 text-center">
                Log time across several weeks to see your utilization trend.
            </p>
        );
    }

    const latest = points[points.length - 1];
    const yMax = Math.max(capacityHours + 4, ...points.map((p) => p.hours));

    return (
        <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        8-week utilization
                    </p>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                        {latest.utilizationPercent}%
                        <span className="text-sm font-normal text-slate-500 ml-1.5">this week</span>
                    </p>
                </div>
                <p className="text-xs text-slate-500 text-right">
                    {latest.hours}h of {capacityHours}h target
                </p>
            </div>

            <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={points} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            dataKey="weekLabel"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            unit="h"
                            domain={[0, yMax]}
                        />
                        <ReferenceLine
                            y={capacityHours}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            label={{
                                value: `${capacityHours}h`,
                                position: 'insideTopRight',
                                fontSize: 9,
                                fill: '#d97706',
                            }}
                        />
                        <Tooltip content={<HoursTooltip capacityHours={capacityHours} />} />
                        <Bar dataKey="hours" name="Hours logged" radius={[4, 4, 0, 0]} maxBarSize={28}>
                            {points.map((p) => (
                                <Cell key={p.weekStart} fill={barColor(p, capacityHours)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
                Hours logged per week vs your {capacityHours}h target (dashed line). Purple bar = current week.
            </p>
        </div>
    );
}
