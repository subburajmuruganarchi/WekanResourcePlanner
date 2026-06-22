import { BarChart3, FolderKanban, AlertTriangle, Users } from 'lucide-react';
import type { TimeKPIs } from './types';

interface TimeIntelligencePanelProps {
    kpis: TimeKPIs;
    topProject?: string;
    missingDays: number;
    isManager?: boolean;
    teamPending?: number;
}

export function TimeIntelligencePanel({
    kpis,
    topProject,
    missingDays,
    isManager,
    teamPending = 0,
}: TimeIntelligencePanelProps) {
    const cards = [
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
            small: true,
        },
        {
            icon: AlertTriangle,
            label: 'Missing Entries',
            value: `${missingDays} day${missingDays === 1 ? '' : 's'}`,
            accent: missingDays > 0 ? 'text-amber-600' : 'text-emerald-600',
        },
    ];

    if (isManager) {
        cards.push({
            icon: Users,
            label: 'Pending Approvals',
            value: String(teamPending),
            accent: teamPending > 0 ? 'text-amber-600' : 'text-slate-600',
        });
    }

    return (
        <aside className="w-full xl:w-[280px] shrink-0 space-y-3">
            <div className="dashboard-card overflow-hidden sticky top-20">
                <div className="px-4 py-3 enterprise-gradient-bg">
                    <h2 className="text-sm font-semibold text-white">Time Intelligence</h2>
                    <p className="text-[10px] text-white/80 mt-0.5">Weekly productivity insights</p>
                </div>
                <div className="p-3 space-y-2">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.label}
                                className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 shrink-0 ${card.accent}`} />
                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                        {card.label}
                                    </span>
                                </div>
                                <p
                                    className={`mt-1 font-semibold ${card.small ? 'text-sm truncate' : 'text-lg tabular-nums'} ${card.accent}`}
                                >
                                    {card.value}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
