import { WeeklyCapacityEngine } from './weekly-capacity.engine';

describe('WeeklyCapacityEngine', () => {
    const engine = new WeeklyCapacityEngine(40);

    it('sums planned hours across project cells', () => {
        const committed = engine.weeklyCommittedHours([
            { projectId: 'a', plannedHours: 20, actualHours: 0, forecastHours: 20 },
            { projectId: 'b', plannedHours: 15, actualHours: 0, forecastHours: 15 },
        ]);
        expect(committed).toBe(35);
    });

    it('detects over-allocation above 40h', () => {
        expect(engine.isOverAllocated(41)).toBe(true);
        expect(engine.isOverAllocated(40)).toBe(false);
    });

    it('computes bench percent from unallocated hours', () => {
        expect(engine.benchPercentFromCommitted(30)).toBe(25);
        expect(engine.benchPercentFromCommitted(40)).toBe(0);
    });

    it('computes utilization percent', () => {
        expect(engine.utilizationPercent(20)).toBe(50);
        expect(engine.utilizationPercent(50)).toBe(100);
    });

    it('rejects proposed week that exceeds capacity', () => {
        const err = engine.validateProposedWeek(
            [{ projectId: 'a', plannedHours: 30, actualHours: 0, forecastHours: 30 }],
            [{ projectId: 'b', plannedHours: 15 }]
        );
        expect(err).toMatch(/exceed capacity/);
    });

    it('maps legacy allocation percent to weekly hours', () => {
        expect(WeeklyCapacityEngine.plannedHoursFromAllocationPercent(100)).toBe(40);
        expect(WeeklyCapacityEngine.plannedHoursFromAllocationPercent(50)).toBe(20);
    });

    it('computes actual minus planned variance', () => {
        expect(engine.actualMinusPlannedVariance(30, 25)).toBe(-5);
        expect(engine.actualMinusPlannedVariance(20, 28)).toBe(8);
    });

    it('computes plan minus actual variance', () => {
        expect(engine.planMinusActualVariance(30, 25)).toBe(5);
    });

    it('computes variance and forecast accuracy percent', () => {
        expect(engine.variancePercent(40, 32)).toBe(-20);
        expect(engine.forecastAccuracyPercent(32, 32)).toBe(100);
    });
});
