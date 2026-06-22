import { FolderKanban, Users, Clock, Gauge, AlertTriangle } from 'lucide-react';
import type { AllocationMetrics } from './types';

interface CapacityCardsProps {
    metrics: AllocationMetrics;
    loading?: boolean;
}

const CARDS = [
    { key: 'projectCount' as const, label: 'Projects', icon: FolderKanban, format: (v: number) => String(v) },
    { key: 'resourceCount' as const, label: 'Resources', icon: Users, format: (v: number) => String(v) },
    {
        key: 'allocatedHours' as const,
        label: 'Allocated Hours',
        icon: Clock,
        format: (v: number) => `${v.toLocaleString()} hrs`,
    },
    {
        key: 'utilizationPercent' as const,
        label: 'Utilization',
        icon: Gauge,
        format: (v: number) => `${v}%`,
    },
    {
        key: 'overCapacityCount' as const,
        label: 'Over Capacity',
        icon: AlertTriangle,
        format: (v: number) => String(v),
        accent: true,
    },
];

export function CapacityCards({ metrics, loading }: CapacityCardsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {CARDS.map((c) => (
                    <div key={c.key} className="dashboard-card h-[88px] animate-pulse bg-slate-50" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {CARDS.map((card) => {
                const Icon = card.icon;
                const value = metrics[card.key];
                return (
                    <div
                        key={card.key}
                        className="dashboard-card px-4 py-3.5 flex flex-col justify-between min-h-[88px]"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                {card.label}
                            </span>
                            <Icon
                                className={`w-4 h-4 shrink-0 ${card.accent && value > 0 ? 'text-amber-500' : 'text-indigo-400'}`}
                                aria-hidden
                            />
                        </div>
                        <p
                            className={`text-xl font-semibold tabular-nums tracking-tight ${
                                card.accent && value > 0 ? 'text-amber-700' : 'text-slate-900'
                            }`}
                        >
                            {card.format(value)}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
