import { startOfUtcWeek, listUtcWeekStarts } from '../../common/utils/week.util';

const UTC_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const UTC_MONTHS_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const;

export function currentUtcMonday(): Date {
    return startOfUtcWeek(new Date());
}

export function addUtcWeeks(base: Date, weeks: number): Date {
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + weeks * 7);
    return d;
}

export function formatWeekHeaderUtc(weekStart: Date, includeYear = false): string {
    const month = UTC_MONTHS_SHORT[weekStart.getUTCMonth()];
    const day = weekStart.getUTCDate();
    if (includeYear) {
        return `${month} ${day}, ${weekStart.getUTCFullYear()}`;
    }
    return `${month} ${day}`;
}

export function formatMonthYearHeaderUtc(weekStart: Date): string {
    const month = UTC_MONTHS_LONG[weekStart.getUTCMonth()];
    return `${month} ${weekStart.getUTCFullYear()}`.toUpperCase();
}

export function buildForwardUtcWeeks(numWeeks: number): Date[] {
    const currentMonday = currentUtcMonday();
    return listUtcWeekStarts(currentMonday, addUtcWeeks(currentMonday, numWeeks - 1));
}

export function buildHistoricUtcWeeks(
    minStart: Date,
    maxEnd: Date,
    currentMonday: Date,
    forwardWeeks: number,
    maxWeekCount = 104
): Date[] {
    const start = startOfUtcWeek(minStart);
    const endCandidate = startOfUtcWeek(maxEnd);
    const endMonday = new Date(
        Math.max(endCandidate.getTime(), addUtcWeeks(currentMonday, forwardWeeks - 1).getTime())
    );
    const weeks = listUtcWeekStarts(start, endMonday);
    return weeks.length > maxWeekCount ? weeks.slice(0, maxWeekCount) : weeks;
}
