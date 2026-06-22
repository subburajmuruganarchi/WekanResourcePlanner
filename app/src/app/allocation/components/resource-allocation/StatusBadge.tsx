import { cn } from '@/lib/utils';
import type { UtilizationStatus } from './types';

const STATUS_CONFIG: Record<
    UtilizationStatus,
    { label: string; className: string }
> = {
    available: {
        label: 'Available',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    },
    optimal: {
        label: 'Optimal',
        className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    },
    high: {
        label: 'High Utilization',
        className: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    },
    overloaded: {
        label: 'Overloaded',
        className: 'bg-red-50 text-red-700 ring-red-600/20',
    },
    'on-leave': {
        label: 'On Leave',
        className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    },
};

interface StatusBadgeProps {
    status: UtilizationStatus;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
}
