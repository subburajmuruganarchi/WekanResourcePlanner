import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { DEFAULT_WEEKLY_CAPACITY_HOURS } from '@/lib/weekly-grid-pivot';
import type { WeeklyCapacitySummary } from '@/types/weekly-allocation';
import { AllocationCell } from './AllocationCell';
import { StatusBadge } from './StatusBadge';
import { utilizationStatusFromPercent } from './allocation-metrics';

interface CapacityViewProps {
    capacitySummary: WeeklyCapacitySummary[];
    weeks: string[];
    loading?: boolean;
}

export function CapacityView({ capacitySummary, weeks, loading }: CapacityViewProps) {
    const rows = useMemo(() => {
        const filtered = capacitySummary.filter((s) => weeks.includes(s.weekStart));
        const byEmployee = new Map<
            string,
            { name: string; weeks: WeeklyCapacitySummary[]; peak: number; overWeeks: number }
        >();

        for (const s of filtered) {
            const existing = byEmployee.get(s.employeeId) ?? {
                name: s.employeeName ?? 'Unknown',
                weeks: [] as WeeklyCapacitySummary[],
                peak: 0,
                overWeeks: 0,
            };
            existing.weeks.push(s);
            existing.peak = Math.max(existing.peak, s.utilizationPercent);
            if (s.isOverAllocated) existing.overWeeks += 1;
            byEmployee.set(s.employeeId, existing);
        }

        return [...byEmployee.values()]
            .map((e) => ({
                ...e,
                avgUtil: Math.round(
                    e.weeks.reduce((a, w) => a + w.utilizationPercent, 0) / e.weeks.length
                ),
            }))
            .sort((a, b) => b.peak - a.peak);
    }, [capacitySummary, weeks]);

    if (loading) {
        return <div className="dashboard-card h-80 animate-pulse bg-slate-50" />;
    }

    if (rows.length === 0) {
        return (
            <div className="dashboard-card py-16 text-center">
                <p className="text-sm font-medium text-slate-700">No capacity data</p>
                <p className="text-xs text-slate-500 mt-1">Load allocation data to see capacity trends.</p>
            </div>
        );
    }

    return (
        <div className="dashboard-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Capacity Forecast</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                    Weekly utilization trends per resource ({DEFAULT_WEEKLY_CAPACITY_HOURS}h capacity).
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                            <th className="sticky left-0 bg-slate-50/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-500">
                                Resource
                            </th>
                            {weeks.map((w) => (
                                <th
                                    key={w}
                                    className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-500 min-w-[100px]"
                                >
                                    {format(parseISO(w), 'MMM d')}
                                </th>
                            ))}
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-500">
                                Peak
                            </th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-500">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const status = utilizationStatusFromPercent(
                                row.peak,
                                row.overWeeks > 0
                            );
                            return (
                                <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50/40">
                                    <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-slate-900 border-r border-slate-100">
                                        {row.name}
                                    </td>
                                    {weeks.map((w) => {
                                        const weekData = row.weeks.find((x) => x.weekStart === w);
                                        const pct = weekData?.utilizationPercent ?? 0;
                                        const st = utilizationStatusFromPercent(
                                            pct,
                                            weekData?.isOverAllocated
                                        );
                                        return (
                                            <td key={w} className="px-3 py-2.5">
                                                <AllocationCell
                                                    percent={pct}
                                                    status={st}
                                                    hours={weekData?.committedHours}
                                                    compact
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-2.5 tabular-nums font-medium text-slate-700">
                                        {row.peak}%
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <StatusBadge status={status} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
