import {
    computeAvailabilityInPeriod,
    computeEmployeeAvailabilityPercent,
    type AllocationCapacitySlice,
} from './allocation-availability.util';

describe('computeAvailabilityInPeriod', () => {
    const periodStart = new Date('2026-01-01T00:00:00.000Z');
    const periodEnd = new Date('2026-01-07T00:00:00.000Z');

    it('returns 100% free when no allocations', () => {
        const r = computeAvailabilityInPeriod([], periodStart, periodEnd);
        expect(r.availability).toBe(100);
        expect(r.peakCommittedPercent).toBe(0);
    });

    it('tracks single project at 60%', () => {
        const allocs: AllocationCapacitySlice[] = [
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-01-07'),
                allocation_percent: 60,
            },
        ];
        const r = computeAvailabilityInPeriod(allocs, periodStart, periodEnd);
        expect(r.peakCommittedPercent).toBe(60);
        expect(r.minFreePercent).toBe(40);
        expect(r.availability).toBe(40);
    });

    it('sums concurrent allocations on the same days (not double-count days)', () => {
        const allocs: AllocationCapacitySlice[] = [
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-01-07'),
                allocation_percent: 60,
            },
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-01-07'),
                allocation_percent: 20,
            },
        ];
        const r = computeAvailabilityInPeriod(allocs, periodStart, periodEnd);
        expect(r.peakCommittedPercent).toBe(80);
        expect(r.minFreePercent).toBe(20);
        expect(r.availability).toBe(20);
    });

    it('frees capacity when another project ends before the window', () => {
        const allocs: AllocationCapacitySlice[] = [
            {
                start_date: new Date('2025-12-01'),
                end_date: new Date('2025-12-31'),
                allocation_percent: 100,
            },
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-01-07'),
                allocation_percent: 30,
            },
        ];
        const r = computeAvailabilityInPeriod(allocs, periodStart, periodEnd);
        expect(r.peakCommittedPercent).toBe(30);
        expect(r.availability).toBe(70);
    });

    it('caps combined load at 100%', () => {
        const allocs: AllocationCapacitySlice[] = [
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-01-03'),
                allocation_percent: 70,
            },
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-01-03'),
                allocation_percent: 50,
            },
        ];
        const r = computeAvailabilityInPeriod(allocs, periodStart, periodEnd);
        expect(r.peakCommittedPercent).toBe(100);
        expect(r.minFreePercent).toBe(0);
    });
});

describe('computeEmployeeAvailabilityPercent', () => {
    const asOf = new Date('2026-01-05T00:00:00.000Z');

    it('returns 100% when employee has no allocations', () => {
        expect(computeEmployeeAvailabilityPercent([], { asOf })).toBe(100);
    });

    it('returns free % on busiest day for active allocations', () => {
        const allocs: AllocationCapacitySlice[] = [
            {
                start_date: new Date('2026-01-01'),
                end_date: new Date('2026-03-31'),
                allocation_percent: 60,
            },
        ];
        expect(computeEmployeeAvailabilityPercent(allocs, { asOf })).toBe(40);
    });

    it('ignores allocations that ended before today', () => {
        const allocs: AllocationCapacitySlice[] = [
            {
                start_date: new Date('2025-10-01'),
                end_date: new Date('2025-12-31'),
                allocation_percent: 100,
            },
        ];
        expect(computeEmployeeAvailabilityPercent(allocs, { asOf })).toBe(100);
    });
});
