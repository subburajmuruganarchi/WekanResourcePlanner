import {
    addUtcWeeks,
    buildHistoricUtcWeeks,
    currentUtcMonday,
    formatMonthYearHeaderUtc,
    formatWeekHeaderUtc,
} from './report-week.util';
import { startOfUtcWeek } from '../../common/utils/week.util';

describe('report-week.util', () => {
    it('formats month/year from UTC week start (not local timezone)', () => {
        const jan2026 = startOfUtcWeek('2026-01-05T00:00:00.000Z');
        expect(formatMonthYearHeaderUtc(jan2026)).toBe('JANUARY 2026');
        expect(formatWeekHeaderUtc(jan2026, true)).toBe('Jan 5, 2026');
    });

    it('keeps December year for late-December UTC Mondays', () => {
        const dec2025 = startOfUtcWeek('2025-12-29T00:00:00.000Z');
        expect(formatMonthYearHeaderUtc(dec2025)).toBe('DECEMBER 2025');
    });

    it('builds historic weeks across year boundary without shifting years', () => {
        const currentMonday = currentUtcMonday();
        const weeks = buildHistoricUtcWeeks(
            new Date('2025-11-24T00:00:00.000Z'),
            new Date('2026-02-02T00:00:00.000Z'),
            currentMonday,
            12
        );
        expect(weeks.length).toBeGreaterThan(0);
        expect(weeks[0].toISOString().slice(0, 10)).toBe('2025-11-24');
        const janWeek = weeks.find((w) => w.toISOString().startsWith('2026-01-05'));
        expect(janWeek).toBeDefined();
        expect(formatMonthYearHeaderUtc(janWeek!)).toBe('JANUARY 2026');
    });

    it('addUtcWeeks advances exactly seven days per week', () => {
        const start = startOfUtcWeek('2026-06-08T00:00:00.000Z');
        expect(addUtcWeeks(start, 1).toISOString().slice(0, 10)).toBe('2026-06-15');
    });
});
