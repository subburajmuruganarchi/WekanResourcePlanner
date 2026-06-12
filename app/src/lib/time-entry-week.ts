import { addDays, addWeeks, format, parseISO } from 'date-fns';
import { getCurrentWeekStart, snapToMonday } from '@/lib/dashboard-period';

export interface WeekDayInfo {
    day: string;
    date: string;
    fullDate: string;
    isWeekday: boolean;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getWeekDaysFromMonday(weekStart: string): WeekDayInfo[] {
    const monday = snapToMonday(weekStart);
    const mondayDate = parseISO(monday);

    return DAY_NAMES.map((day, i) => {
        const d = addDays(mondayDate, i);
        const dow = d.getDay();
        return {
            day,
            date: format(d, 'MMM d'),
            fullDate: format(d, 'yyyy-MM-dd'),
            isWeekday: dow >= 1 && dow <= 5,
        };
    });
}

export function formatWeekRangeLabel(weekStart: string): string {
    const days = getWeekDaysFromMonday(weekStart);
    const year = parseISO(days[0].fullDate).getFullYear();
    return `${days[0].date} – ${days[6].date}, ${year}`;
}

export function shiftWeekStart(weekStart: string, weeks: number): string {
    return format(addWeeks(parseISO(snapToMonday(weekStart)), weeks), 'yyyy-MM-dd');
}

export function isCurrentWeek(weekStart: string): boolean {
    return snapToMonday(weekStart) === getCurrentWeekStart();
}

export function isFutureWeek(weekStart: string): boolean {
    return snapToMonday(weekStart) > getCurrentWeekStart();
}

/** Mon–Fri names that have no entry with hours > 0. */
export function getMissingWeekdays(
    weekDays: WeekDayInfo[],
    entriesByDate: Map<string, { hours: number; projectCode: string }[]>
): string[] {
    const missing: string[] = [];
    for (const day of weekDays) {
        if (!day.isWeekday) continue;
        const dayEntries = entriesByDate.get(day.fullDate) ?? [];
        const hasHours = dayEntries.some((e) => e.hours > 0 && e.projectCode);
        if (!hasHours) missing.push(day.day);
    }
    return missing;
}

export { getCurrentWeekStart };
