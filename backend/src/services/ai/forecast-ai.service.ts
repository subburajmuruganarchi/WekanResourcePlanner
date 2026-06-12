import { TimeEntry } from '../../modules/time-entries/time-entry.model';
import { timeEntryService } from '../../modules/time-entries/time-entry.service';
import { TimeEntrySuggestions, TimeEntrySuggestionDay } from './types';

function previousWeekStart(weekStart: string): string {
    const d = new Date(weekStart + 'T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().split('T')[0];
}

/** Suggested hours from forecast API + last-week pattern — user must confirm. */
export async function buildTimeEntrySuggestions(
    employeeId: string,
    weekStart: string
): Promise<TimeEntrySuggestions> {
    const forecast = await timeEntryService.getDailyForecast(employeeId, weekStart);

    const prevStart = previousWeekStart(weekStart);
    const prevEnd = new Date(prevStart + 'T00:00:00.000Z');
    prevEnd.setUTCDate(prevEnd.getUTCDate() + 6);

    const lastWeekEntries = await TimeEntry.find({
        employeeId,
        weekStartDate: new Date(prevStart + 'T00:00:00.000Z'),
    }).lean();

    const hoursByDay = new Map<string, number>();
    for (const e of lastWeekEntries) {
        const day = new Date(e.date).toISOString().split('T')[0];
        hoursByDay.set(day, (hoursByDay.get(day) || 0) + e.hours);
    }

    const days: TimeEntrySuggestionDay[] = (forecast?.days || []).map((day) => {
        const forecastH = day.totalForecast ?? 0;
        const lastWeekDay = new Date(day.date + 'T12:00:00');
        lastWeekDay.setUTCDate(lastWeekDay.getUTCDate() - 7);
        const lastKey = lastWeekDay.toISOString().split('T')[0];
        const lastH = hoursByDay.get(lastKey) ?? 0;

        let suggested = forecastH;
        let source: TimeEntrySuggestionDay['source'] = 'forecast';
        if (lastH > 0 && lastH !== forecastH) {
            suggested = Math.round((forecastH + lastH) / 2);
            source = 'pattern';
        } else if (lastH > 0) {
            suggested = lastH;
            source = 'last_week';
        }

        return {
            date: day.date,
            suggestedHours: Math.round(suggested * 10) / 10,
            source,
        };
    });

    const lastWeekTotalHours = lastWeekEntries.reduce((s, e) => s + e.hours, 0);
    const narrative =
        lastWeekTotalHours > 0
            ? `Suggestions blend allocation forecast with ${lastWeekTotalHours}h from last week. Confirm before saving.`
            : 'Suggestions based on allocation forecast for this week. Confirm before saving.';

    return {
        employeeId,
        weekStart,
        days,
        narrative,
        lastWeekTotalHours,
    };
}
