import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WeeklyNavigatorProps {
    weekLabel: string;
    weekStart: string;
    isCurrentWeek: boolean;
    isFutureWeek: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onToday: () => void;
    onDatePick: (date: string) => void;
}

export function WeeklyNavigator({
    weekLabel,
    weekStart,
    isCurrentWeek,
    isFutureWeek,
    onPrevious,
    onNext,
    onToday,
    onDatePick,
}: WeeklyNavigatorProps) {
    return (
        <div className="dashboard-card px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={onPrevious}
                        aria-label="Previous week"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0 text-center sm:text-left px-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {isCurrentWeek
                                ? 'Current Week'
                                : isFutureWeek
                                  ? 'Future Week'
                                  : 'Past Week'}
                        </p>
                        <p className="font-semibold text-slate-900 text-sm">{weekLabel}</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={onNext}
                        aria-label="Next week"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-end">
                    {!isCurrentWeek && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={onToday}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Today
                        </Button>
                    )}
                    <Input
                        type="date"
                        className="h-9 w-[150px] border-slate-200"
                        value={weekStart}
                        onChange={(e) => onDatePick(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
