import { cn } from '@/lib/utils';
import type { UtilizationStatus } from './types';

const BAR_COLORS: Record<UtilizationStatus, string> = {
    available: 'bg-emerald-500',
    optimal: 'bg-indigo-500',
    high: 'bg-amber-500',
    overloaded: 'bg-red-500',
    'on-leave': 'bg-slate-300',
};

interface AllocationCellProps {
    percent: number;
    status: UtilizationStatus;
    hours?: number;
    capacityHours?: number;
    compact?: boolean;
    className?: string;
}

export function AllocationCell({
    percent,
    status,
    hours,
    capacityHours = 40,
    compact = false,
    className,
}: AllocationCellProps) {
    const width = Math.min(100, Math.max(0, percent));

    return (
        <div className={cn('space-y-1', className)}>
            <div
                className={cn(
                    'relative overflow-hidden rounded-md bg-slate-100',
                    compact ? 'h-2' : 'h-2.5'
                )}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={cn('h-full rounded-md transition-all duration-300', BAR_COLORS[status])}
                    style={{ width: `${width}%` }}
                />
            </div>
            {!compact && (
                <p className="text-[10px] font-medium text-slate-500 tabular-nums">
                    {hours != null ? `${hours}/${capacityHours}h` : `${percent}%`}
                </p>
            )}
        </div>
    );
}
