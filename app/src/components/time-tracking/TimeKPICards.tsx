import { Clock, Hourglass, TrendingUp, FolderKanban } from 'lucide-react';
import type { TimeKPIs } from './types';

interface TimeKPICardsProps {
    kpis: TimeKPIs;
    loading?: boolean;
}

/** Primary metrics strip — compact for production density */
export function TimeKPICards({ kpis, loading }: TimeKPICardsProps) {
    const cards = [
        { label: 'Logged', value: `${kpis.loggedHours}h`, sub: `of ${kpis.weeklyCapacity}h`, icon: Clock },
        { label: 'Remaining', value: `${kpis.remainingHours}h`, sub: 'to capacity', icon: Hourglass },
        { label: 'Utilization', value: `${kpis.utilizationPercent}%`, sub: 'this week', icon: TrendingUp },
        { label: 'Projects', value: String(kpis.projectsWorked), sub: kpis.approvalLabel, icon: FolderKanban },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((c) => (
                    <div key={c.label} className="dashboard-card h-[72px] animate-pulse bg-slate-50" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className="dashboard-card px-4 py-3 flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                {card.label}
                            </p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">
                                {card.value}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{card.sub}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
