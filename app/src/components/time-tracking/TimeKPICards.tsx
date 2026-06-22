import {
    Gauge,
    Clock,
    Hourglass,
    TrendingUp,
    FolderKanban,
    ClipboardCheck,
} from 'lucide-react';
import type { TimeKPIs } from './types';

interface TimeKPICardsProps {
    kpis: TimeKPIs;
    loading?: boolean;
}

const CARDS = [
    {
        key: 'weeklyCapacity' as const,
        label: 'Weekly Capacity',
        icon: Gauge,
        suffix: ' hrs',
        hint: 'Standard work week target',
    },
    {
        key: 'loggedHours' as const,
        label: 'Logged Hours',
        icon: Clock,
        suffix: ' hrs',
        hint: 'Saved and draft entries',
    },
    {
        key: 'remainingHours' as const,
        label: 'Remaining',
        icon: Hourglass,
        suffix: ' hrs',
        hint: 'Hours left to reach capacity',
    },
    {
        key: 'utilizationPercent' as const,
        label: 'Utilization',
        icon: TrendingUp,
        suffix: '%',
        hint: 'Logged vs weekly capacity',
    },
    {
        key: 'projectsWorked' as const,
        label: 'Projects Worked',
        icon: FolderKanban,
        suffix: '',
        hint: 'Distinct projects this week',
    },
    {
        key: 'approvalLabel' as const,
        label: 'Approval Status',
        icon: ClipboardCheck,
        suffix: '',
        hint: 'Current timesheet workflow state',
        isText: true,
    },
];

export function TimeKPICards({ kpis, loading }: TimeKPICardsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {CARDS.map((c) => (
                    <div key={c.key} className="dashboard-card h-[96px] animate-pulse bg-slate-50" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {CARDS.map((card) => {
                const Icon = card.icon;
                const raw = kpis[card.key];
                const display = card.isText ? String(raw) : `${raw}${card.suffix}`;
                return (
                    <div
                        key={card.key}
                        className="dashboard-card px-4 py-3.5 flex flex-col justify-between min-h-[96px] hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {card.label}
                            </span>
                            <Icon className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden />
                        </div>
                        <p className="text-xl font-semibold tabular-nums text-slate-900 tracking-tight">
                            {display}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-snug">{card.hint}</p>
                    </div>
                );
            })}
        </div>
    );
}
