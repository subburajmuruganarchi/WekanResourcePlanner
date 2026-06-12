import {
    addDays,
    endOfMonth,
    format,
    parseISO,
    startOfMonth,
    startOfWeek,
} from 'date-fns';

export type DashboardPeriodMode = 'week' | 'month';

export interface DashboardPeriodRange {
    weekStartFrom: string;
    weekStartTo: string;
}

export function getCurrentWeekStart(): string {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getCurrentMonthValue(): string {
    return format(new Date(), 'yyyy-MM');
}

export function snapToMonday(dateStr: string): string {
    return format(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getWeekRange(weekStart: string): DashboardPeriodRange {
    const monday = snapToMonday(weekStart);
    return { weekStartFrom: monday, weekStartTo: monday };
}

/** All Monday week-starts that overlap the calendar month. */
export function getMonthWeekRange(monthValue: string): DashboardPeriodRange {
    const [yearStr, monthStr] = monthValue.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const first = startOfMonth(new Date(year, month - 1, 1));
    const last = endOfMonth(first);
    return {
        weekStartFrom: format(startOfWeek(first, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        weekStartTo: format(startOfWeek(last, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    };
}

export function buildDashboardPeriodRange(
    mode: DashboardPeriodMode,
    weekStart: string,
    monthValue: string
): DashboardPeriodRange {
    return mode === 'week' ? getWeekRange(weekStart) : getMonthWeekRange(monthValue);
}

export function formatDashboardPeriodLabel(
    mode: DashboardPeriodMode,
    range: DashboardPeriodRange,
    monthValue?: string
): string {
    if (mode === 'month' && monthValue) {
        const [yearStr, monthStr] = monthValue.split('-');
        return format(new Date(Number(yearStr), Number(monthStr) - 1, 1), 'MMMM yyyy');
    }

    const from = parseISO(range.weekStartFrom);
    return `${format(from, 'MMM d')} – ${format(addDays(from, 6), 'MMM d, yyyy')}`;
}

export function getThisWeekRange(): DashboardPeriodRange {
    return getWeekRange(getCurrentWeekStart());
}

export function getThisMonthRange(): DashboardPeriodRange {
    return getMonthWeekRange(getCurrentMonthValue());
}

export function periodQueryString(range: DashboardPeriodRange): string {
    const q = new URLSearchParams({
        weekStartFrom: range.weekStartFrom,
        weekStartTo: range.weekStartTo,
    });
    return q.toString();
}
