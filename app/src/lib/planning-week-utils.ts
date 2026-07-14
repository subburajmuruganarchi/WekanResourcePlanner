import { addWeeks, format, parseISO, startOfWeek } from 'date-fns';

/** ISO Monday of the current week (local). */
export function getCurrentWeekStart(): string {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

/** Planning horizon: current Monday through +N weeks (default 12 weeks total). */
export function buildPlanningWeekRange(weeksForward = 11): {
    weekStartFrom: string;
    weekStartTo: string;
} {
    const from = startOfWeek(new Date(), { weekStartsOn: 1 });
    const to = addWeeks(from, weeksForward);
    return {
        weekStartFrom: format(from, 'yyyy-MM-dd'),
        weekStartTo: format(to, 'yyyy-MM-dd'),
    };
}

export function filterWeeksFromCurrent(weeks: string[]): string[] {
    const currentMonday = getCurrentWeekStart();
    return weeks.filter((w) => w >= currentMonday);
}

export function listWeekStartsInRange(from: string, to: string): string[] {
    const out: string[] = [];
    let cur = parseISO(from);
    const end = parseISO(to);
    while (cur <= end) {
        out.push(format(cur, 'yyyy-MM-dd'));
        cur = addWeeks(cur, 1);
    }
    return out;
}
