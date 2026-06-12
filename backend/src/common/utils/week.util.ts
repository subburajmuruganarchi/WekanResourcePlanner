/**
 * UTC week boundaries aligned to ISO Monday (matches dashboard time-entry weeks).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** UTC Monday 00:00:00.000 for the week containing `date` (or `date` if already Monday UTC). */
export function startOfUtcWeek(date: Date | string): Date {
    const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
    if (Number.isNaN(d.getTime())) {
        throw new Error('Invalid date for week calculation');
    }
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

export function endOfUtcWeek(weekStart: Date): Date {
    const end = new Date(weekStart.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return end;
}

/** Inclusive list of UTC week starts from `from` through `to`. */
export function listUtcWeekStarts(from: Date, to: Date): Date[] {
    const start = startOfUtcWeek(from);
    const end = startOfUtcWeek(to);
    if (end < start) return [];

    const weeks: Date[] = [];
    for (let cursor = new Date(start.getTime()); cursor <= end; cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY)) {
        weeks.push(new Date(cursor.getTime()));
    }
    return weeks;
}

export function weekStartToIsoDate(weekStart: Date): string {
    return weekStart.toISOString().slice(0, 10);
}

export function parseWeekStartParam(value: string): Date {
    const d = startOfUtcWeek(new Date(value));
    return d;
}

/** Max weeks allowed in a single grid query (guardrail). */
export const MAX_GRID_WEEK_SPAN = 52;

export function assertWeekRangeWithinLimit(from: Date, to: Date, maxWeeks = MAX_GRID_WEEK_SPAN): void {
    const weeks = listUtcWeekStarts(from, to);
    if (weeks.length > maxWeeks) {
        throw new Error(`Week range exceeds maximum of ${maxWeeks} weeks`);
    }
}

export function isFutureUtcWeek(weekStart: Date | string): boolean {
    const monday = startOfUtcWeek(weekStart);
    const currentMonday = startOfUtcWeek(new Date());
    return monday.getTime() > currentMonday.getTime();
}
