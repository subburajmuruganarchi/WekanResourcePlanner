import { BarChart3, FolderKanban, AlertTriangle } from 'lucide-react';
import type { TimeKPIs } from './types';

interface InsightPanelProps {
    kpis: TimeKPIs;
    topProject?: string;
    missingDays: number;
}

export function InsightPanel({ kpis, topProject, missingDays }: InsightPanelProps) {
    const items = [
        {
            icon: BarChart3,
            label: 'Utilization',
            value: `${kpis.utilizationPercent}%`,
            accent: kpis.utilizationPercent >= 85 ? 'text-amber-600' : 'text-indigo-600',
        },
        {
            icon: FolderKanban,
            label: 'Top Project',
            value: topProject ?? '—',
            accent: 'text-slate-900',
            truncate: true,
        },
        {
            icon: AlertTriangle,
            label: 'Missing Entries',
            value: `${missingDays} day${missingDays === 1 ? '' : 's'}`,
            accent: missingDays > 0 ? 'text-amber-600' : 'text-emerald-600',
        },
    ];

    return (
        <div className="tt-card overflow-hidden w-full max-w-[360px]">
            <div className="px-5 py-5 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Time Intelligence</h2>
                <p className="text-sm text-slate-500 mt-1">Weekly productivity insights</p>
            </div>
            <div className="p-5 space-y-5">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            className="rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-4"
                        >
                            <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 shrink-0 ${item.accent}`} />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    {item.label}
                                </span>
                            </div>
                            <p
                                className={`mt-2 text-2xl font-semibold tabular-nums ${item.accent} ${item.truncate ? 'truncate' : ''}`}
                            >
                                {item.value}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
