import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { snapToMonday } from '@/lib/dashboard-period';

interface WeekJumpCalendarProps {
    weekStart: string;
    onWeekStartChange: (weekStart: string) => void;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function WeekJumpCalendar({ weekStart, onWeekStartChange }: WeekJumpCalendarProps) {
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => parseISO(weekStart));

    const weekDays = useMemo(() => {
        const monday = parseISO(snapToMonday(weekStart));
        return eachDayOfInterval({
            start: monday,
            end: endOfWeek(monday, { weekStartsOn: 1 }),
        });
    }, [weekStart]);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(visibleMonth);
        const monthEnd = endOfMonth(visibleMonth);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: gridStart, end: gridEnd });
    }, [visibleMonth]);

    const handleDayClick = (day: Date) => {
        onWeekStartChange(snapToMonday(format(day, 'yyyy-MM-dd')));
        setOpen(false);
    };

    const isInSelectedWeek = (day: Date) =>
        weekDays.some((weekDay) => isSameDay(weekDay, day));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-11 gap-2 border-slate-200">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    Jump to week
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="end">
                <div className="mb-2 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
                    >
                        ‹
                    </Button>
                    <p className="text-sm font-semibold text-slate-900">
                        {format(visibleMonth, 'MMMM yyyy')}
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                    >
                        ›
                    </Button>
                </div>

                <div className="mb-1 grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map((label) => (
                        <div
                            key={label}
                            className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                        >
                            {label}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                        const inMonth = isSameMonth(day, visibleMonth);
                        const inWeek = isInSelectedWeek(day);

                        return (
                            <button
                                key={day.toISOString()}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    'h-9 rounded-md text-sm transition-colors',
                                    !inMonth && 'text-slate-300',
                                    inMonth && !inWeek && 'text-slate-700 hover:bg-slate-100',
                                    inWeek && 'bg-brand-100 text-brand-800 font-semibold ring-1 ring-brand-300'
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
