import { useMemo, useState } from 'react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    parseISO,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DatePickMode = 'single' | 'range';

export interface DateRangeValue {
    from: string;
    to: string;
}

interface TimeEntryDatePickerProps {
    mode: DatePickMode;
    onModeChange: (mode: DatePickMode) => void;
    singleDate: string;
    range: DateRangeValue | null;
    onSingleDateChange: (date: string) => void;
    onRangeChange: (range: DateRangeValue | null) => void;
    disabled?: boolean;
    allowRange?: boolean;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toIso(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

function formatDisplayDate(iso: string): string {
    return format(parseISO(iso), 'EEE, MMM d, yyyy');
}

function formatRangeLabel(range: DateRangeValue): string {
    const from = parseISO(range.from);
    const to = parseISO(range.to);
    if (range.from === range.to) return formatDisplayDate(range.from);
    return `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`;
}

export function TimeEntryDatePicker({
    mode,
    onModeChange,
    singleDate,
    range,
    onSingleDateChange,
    onRangeChange,
    disabled = false,
    allowRange = true,
}: TimeEntryDatePickerProps) {
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => parseISO(singleDate));
    const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

    const triggerLabel = useMemo(() => {
        if (mode === 'range' && range) return formatRangeLabel(range);
        return formatDisplayDate(singleDate);
    }, [mode, range, singleDate]);

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(visibleMonth);
        const monthEnd = endOfMonth(visibleMonth);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: gridStart, end: gridEnd });
    }, [visibleMonth]);

    const rangeInterval = useMemo(() => {
        if (mode !== 'range' || !range) return null;
        const from = parseISO(range.from);
        const to = parseISO(range.to);
        return from <= to ? { start: from, end: to } : { start: to, end: from };
    }, [mode, range]);

    const handleDayClick = (day: Date) => {
        const iso = toIso(day);

        if (mode === 'single') {
            onSingleDateChange(iso);
            setOpen(false);
            return;
        }

        if (!rangeAnchor) {
            setRangeAnchor(iso);
            onRangeChange({ from: iso, to: iso });
            return;
        }

        const from = rangeAnchor <= iso ? rangeAnchor : iso;
        const to = rangeAnchor <= iso ? iso : rangeAnchor;
        onRangeChange({ from, to });
        setRangeAnchor(null);
        setOpen(false);
    };

    const isSelected = (day: Date) => {
        if (mode === 'single') {
            return isSameDay(day, parseISO(singleDate));
        }
        if (!rangeInterval) return false;
        if (rangeAnchor && isSameDay(day, parseISO(rangeAnchor))) return true;
        if (range?.from && isSameDay(day, parseISO(range.from))) return true;
        if (range?.to && isSameDay(day, parseISO(range.to))) return true;
        return isWithinInterval(day, rangeInterval);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="h-10 w-full justify-start gap-2 border-slate-200 font-normal text-slate-800"
                >
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{triggerLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="start">
                {allowRange && (
                    <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                        <button
                            type="button"
                            className={cn(
                                'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                                mode === 'single'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            )}
                            onClick={() => {
                                onModeChange('single');
                                setRangeAnchor(null);
                                onRangeChange(null);
                            }}
                        >
                            Single day
                        </button>
                        <button
                            type="button"
                            className={cn(
                                'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                                mode === 'range'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            )}
                            onClick={() => {
                                onModeChange('range');
                                setRangeAnchor(null);
                                onRangeChange({ from: singleDate, to: singleDate });
                            }}
                        >
                            Date range
                        </button>
                    </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
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
                        <ChevronRight className="h-4 w-4" />
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
                        const selected = isSelected(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                            <button
                                key={day.toISOString()}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    'h-9 rounded-md text-sm transition-colors',
                                    !inMonth && 'text-slate-300',
                                    inMonth && !selected && 'text-slate-700 hover:bg-slate-100',
                                    inMonth && isWeekend && !selected && 'text-slate-500',
                                    selected && 'bg-brand-600 text-white hover:bg-brand-600'
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>

                {mode === 'range' && (
                    <p className="mt-3 text-xs text-slate-500 leading-snug">
                        {rangeAnchor
                            ? 'Select the end date to complete the range.'
                            : 'Select start date, then end date. Weekdays in the range receive the same entry.'}
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}

/** Weekdays (Mon–Fri) within an inclusive date range. */
export function weekdaysInRange(range: DateRangeValue): string[] {
    const from = parseISO(range.from);
    const to = parseISO(range.to);
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    return eachDayOfInterval({ start, end })
        .filter((d) => {
            const dow = d.getDay();
            return dow >= 1 && dow <= 5;
        })
        .map((d) => format(d, 'yyyy-MM-dd'));
}
