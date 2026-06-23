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
        <div className="tt-card px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className="h-11 px-4"
                        onClick={onPrevious}
                        aria-label="Previous week"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous Week
                    </Button>
                    <div className="min-w-0 text-center px-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {isCurrentWeek ? 'Current Week' : isFutureWeek ? 'Future Week' : 'Past Week'}
                        </p>
                        <p className="font-semibold text-slate-900 text-base whitespace-nowrap">{weekLabel}</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className="h-11 px-4"
                        onClick={onNext}
                        aria-label="Next week"
                    >
                        Next Week
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
                <div className="flex items-center gap-3 justify-center sm:justify-end">
                    {!isCurrentWeek && (
                        <Button type="button" variant="outline" className="h-11 gap-2" onClick={onToday}>
                            <CalendarDays className="w-4 h-4" />
                            Today
                        </Button>
                    )}
                    <Input
                        type="date"
                        className="h-11 w-[160px] border-slate-200 text-sm"
                        value={weekStart}
                        onChange={(e) => onDatePick(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
