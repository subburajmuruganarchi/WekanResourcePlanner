import {
    endOfUtcWeek,
    parseWeekStartParam,
    startOfUtcWeek,
    weekStartToIsoDate,
} from '../../common/utils/week.util';

export interface DashboardPeriodRange {
    weekStartFrom: Date;
    weekStartTo: Date;
    periodStart: Date;
    periodEnd: Date;
    weekStartFromIso: string;
    weekStartToIso: string;
}

export function parseDashboardPeriodQuery(
    query: Record<string, unknown>
): DashboardPeriodRange {
    const fromRaw = query.weekStartFrom ? String(query.weekStartFrom) : undefined;
    const toRaw = query.weekStartTo ? String(query.weekStartTo) : undefined;

    const weekStartFrom = fromRaw
        ? startOfUtcWeek(parseWeekStartParam(fromRaw))
        : startOfUtcWeek(new Date());
    const weekStartTo = toRaw
        ? startOfUtcWeek(parseWeekStartParam(toRaw))
        : weekStartFrom;

    if (weekStartTo < weekStartFrom) {
        throw new Error('weekStartTo must be on or after weekStartFrom');
    }

    return {
        weekStartFrom,
        weekStartTo,
        periodStart: weekStartFrom,
        periodEnd: endOfUtcWeek(weekStartTo),
        weekStartFromIso: weekStartToIsoDate(weekStartFrom),
        weekStartToIso: weekStartToIsoDate(weekStartTo),
    };
}
