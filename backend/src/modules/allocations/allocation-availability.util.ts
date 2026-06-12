/**
 * Computes how "free" an employee is over a date window by summing concurrent
 * allocation % on each calendar day (UTC). Multiple active projects on the same
 * day add together (capped at 100%).
 */

export interface AllocationCapacitySlice {
    start_date: Date;
    end_date: Date;
    allocation_percent: number;
}

export interface PeriodAvailability {
    /** Average free % across each day in the window (0–100). */
    availability: number;
    /** Highest combined allocation % on any single day in the window. */
    peakCommittedPercent: number;
    /** Lowest free % on any single day (100 − peak committed). */
    minFreePercent: number;
}

function startOfUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date): Date {
    const x = startOfUtcDay(d);
    x.setUTCHours(23, 59, 59, 999);
    return x;
}

function addUtcDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

function daysInclusive(start: Date, end: Date): number {
    const s = startOfUtcDay(start).getTime();
    const e = startOfUtcDay(end).getTime();
    return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

function overlapsDay(alloc: AllocationCapacitySlice, dayStart: Date, dayEnd: Date): boolean {
    const aStart = new Date(alloc.start_date);
    const aEnd = new Date(alloc.end_date);
    return aStart <= dayEnd && aEnd >= dayStart;
}

/**
 * Average free capacity and peak load across a period.
 * Pass all active allocations that might overlap the window (any project).
 */
export function computeAvailabilityInPeriod(
    allocations: AllocationCapacitySlice[],
    analysisStart: Date,
    analysisEnd: Date
): PeriodAvailability {
    const periodStart = startOfUtcDay(analysisStart);
    const periodEnd = endOfUtcDay(analysisEnd);

    if (periodEnd < periodStart) {
        return { availability: 100, peakCommittedPercent: 0, minFreePercent: 100 };
    }

    const totalDays = daysInclusive(periodStart, periodEnd);

    const overlapping = allocations.filter((a) =>
        overlapsDay(a, periodStart, periodEnd)
    );

    if (overlapping.length === 0) {
        return { availability: 100, peakCommittedPercent: 0, minFreePercent: 100 };
    }

    let sumFree = 0;
    let peakCommitted = 0;

    for (let d = 0; d < totalDays; d++) {
        const dayStart = addUtcDays(periodStart, d);
        const dayEnd = endOfUtcDay(dayStart);

        let committed = 0;
        for (const a of overlapping) {
            if (overlapsDay(a, dayStart, dayEnd)) {
                committed += a.allocation_percent || 0;
            }
        }
        committed = Math.min(100, committed);
        peakCommitted = Math.max(peakCommitted, committed);
        sumFree += 100 - committed;
    }

    const availability = Math.round(sumFree / totalDays);
    const peakCommittedPercent = Math.round(peakCommitted);
    const minFreePercent = Math.round(100 - peakCommitted);

    return {
        availability,
        peakCommittedPercent,
        minFreePercent,
    };
}

/** Peak concurrent % for an employee across their allocation spans (dashboard heatmap). */
export function computePeakCommittedPercent(allocations: AllocationCapacitySlice[]): number {
    if (allocations.length === 0) return 0;

    let minStart = startOfUtcDay(new Date(allocations[0].start_date));
    let maxEnd = endOfUtcDay(new Date(allocations[0].end_date));

    for (const a of allocations) {
        const s = startOfUtcDay(new Date(a.start_date));
        const e = endOfUtcDay(new Date(a.end_date));
        if (s < minStart) minStart = s;
        if (e > maxEnd) maxEnd = e;
    }

    return computeAvailabilityInPeriod(allocations, minStart, maxEnd).peakCommittedPercent;
}

const DEFAULT_AVAILABILITY_HORIZON_DAYS = 90;

/**
 * Free capacity % for an employee directory card: lowest free % on any day
 * from today through active allocation spans (or 90 days, whichever is longer).
 */
export function computeEmployeeAvailabilityPercent(
    allocations: AllocationCapacitySlice[],
    options: { horizonDays?: number; asOf?: Date } = {}
): number {
    const asOf = startOfUtcDay(options.asOf ?? new Date());
    const horizonDays = options.horizonDays ?? DEFAULT_AVAILABILITY_HORIZON_DAYS;
    const defaultEnd = addUtcDays(asOf, horizonDays);

    const overlapping = allocations.filter(
        (a) => new Date(a.end_date) >= asOf && new Date(a.start_date) <= defaultEnd
    );
    if (overlapping.length === 0) return 100;

    let analysisEnd = defaultEnd;
    for (const a of overlapping) {
        const end = endOfUtcDay(new Date(a.end_date));
        if (end > analysisEnd) analysisEnd = end;
    }

    return computeAvailabilityInPeriod(overlapping, asOf, analysisEnd).minFreePercent;
}
