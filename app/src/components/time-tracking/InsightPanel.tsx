import { useEffect } from 'react';
import { FolderKanban, AlertTriangle, Clock } from 'lucide-react';
import { useEmployeeWeeklyHours } from '@/lib/use-employee-weekly-hours';
import { EmployeeUtilizationTrendChart } from './EmployeeUtilizationTrendChart';
import type { TimeKPIs } from './types';

interface InsightPanelProps {
    kpis: TimeKPIs;
    topProject?: string;
    missingDays: number;
    employeeId?: string;
}

export function InsightPanel({ kpis, topProject, missingDays, employeeId }: InsightPanelProps) {
    const { points: weeklyTrend, loading: trendLoading, refetch } = useEmployeeWeeklyHours(employeeId);

    useEffect(() => {
        void refetch();
    }, [kpis.loggedHours, refetch]);

    const items = [
        {
            icon: Clock,
            label: 'This week',
            value: `${kpis.loggedHours}h`,
            sub: `${kpis.utilizationPercent}% of ${kpis.weeklyCapacity}h`,
            accent: kpis.utilizationPercent >= 100 ? 'text-emerald-600' : 'text-brand-600',
        },
        {
            icon: FolderKanban,
            label: 'Top project',
            value: topProject ?? '—',
            accent: 'text-slate-900',
            truncate: true,
        },
        {
            icon: AlertTriangle,
            label: 'Missing entries',
            value: `${missingDays} day${missingDays === 1 ? '' : 's'}`,
            accent: missingDays > 0 ? 'text-amber-600' : 'text-emerald-600',
        },
    ];

    return (
        <section className="tt-card w-full overflow-hidden">
            <header className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Time intelligence</h2>
                <p className="mt-0.5 text-xs text-slate-500">Your weekly hours and utilization trend</p>
            </header>

            <div className="p-4 border-b border-slate-100">
                <EmployeeUtilizationTrendChart
                    points={weeklyTrend}
                    loading={trendLoading}
                    capacityHours={kpis.weeklyCapacity}
                />
            </div>

            <div className="grid gap-3 p-4">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                        >
                            <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 shrink-0 ${item.accent}`} />
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {item.label}
                                </span>
                            </div>
                            <p
                                className={`mt-1.5 text-xl font-semibold tabular-nums ${item.accent} ${item.truncate ? 'truncate' : ''}`}
                                title={item.truncate ? item.value : undefined}
                            >
                                {item.value}
                            </p>
                            {'sub' in item && item.sub && (
                                <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
