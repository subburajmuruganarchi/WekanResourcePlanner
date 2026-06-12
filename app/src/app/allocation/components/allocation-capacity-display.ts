import type { RankedEmployee } from '@/lib/use-ranked-employees';

export type AllocationCapacityStatus = 'allocated' | 'blocked' | 'limited' | 'available';

export interface CapacityDisplay {
    status: AllocationCapacityStatus;
    statusLabel: string;
    headline: string;
    detail?: string;
    barPercent: number;
    canAllocate: boolean;
}

/** Peak-day free % governs new allocations; already-assigned people show their project %. */
export function getCapacityDisplay(emp: RankedEmployee): CapacityDisplay {
    if (emp.isAllocatedToProject && emp.projectAllocation) {
        const pct = emp.projectAllocation.percentage;
        const peakFree = emp.minFreePercent;
        const avgFree = emp.availability;

        return {
            status: 'allocated',
            statusLabel: `Allocated ${pct}% on this project`,
            headline: `${pct}% assigned · ${emp.projectAllocation.startDate} to ${emp.projectAllocation.endDate}`,
            detail:
                peakFree > 0
                    ? `${peakFree}% free on busiest day for additional work · ${avgFree}% free on average across project dates. Use Edit to change this allocation.`
                    : avgFree > 0
                      ? `Fully loaded on the busiest day in this window; other days average ${avgFree}% free. Use Edit to adjust dates or percentage.`
                      : 'Use Edit to change percentage or dates on this project.',
            barPercent: Math.min(100, pct),
            canAllocate: false,
        };
    }

    const peakFree = emp.minFreePercent;
    const peakLoad = emp.peakCommittedPercent;
    const avgFree = emp.availability;
    const canAllocate = peakFree > 0;

    if (!canAllocate) {
        return {
            status: 'blocked',
            statusLabel: 'Cannot allocate',
            headline: `Fully booked on busiest day (${peakLoad}% on other projects)`,
            detail:
                avgFree > 0
                    ? `Other days average ${avgFree}% free, but at least one day in this project window is at 100% — no room to add more.`
                    : 'No free capacity in this project window.',
            barPercent: 0,
            canAllocate: false,
        };
    }

    if (peakFree < 50) {
        return {
            status: 'limited',
            statusLabel: `Can allocate up to ${peakFree}%`,
            headline: `${peakFree}% free on busiest day · ${avgFree}% free on average`,
            detail: 'Allocation limited by the day with the heaviest existing load.',
            barPercent: peakFree,
            canAllocate: true,
        };
    }

    return {
        status: 'available',
        statusLabel: `Can allocate up to ${peakFree}%`,
        headline: `${peakFree}% free on busiest day · ${avgFree}% free on average`,
        detail: undefined,
        barPercent: peakFree,
        canAllocate: true,
    };
}

export function capacityStatusStyles(status: AllocationCapacityStatus) {
    switch (status) {
        case 'allocated':
            return {
                badge: 'bg-brand-50 text-brand-800 border-brand-200',
                bar: 'bg-brand-500',
            };
        case 'blocked':
            return {
                badge: 'bg-red-50 text-red-700 border-red-200',
                bar: 'bg-red-500',
            };
        case 'limited':
            return {
                badge: 'bg-amber-50 text-amber-800 border-amber-200',
                bar: 'bg-yellow-500',
            };
        default:
            return {
                badge: 'bg-green-50 text-green-700 border-green-200',
                bar: 'bg-green-500',
            };
    }
}

export function capacityBarLabel(status: AllocationCapacityStatus): string {
    if (status === 'allocated') return 'This project';
    return 'Busiest day';
}

export function capacityBarSuffix(status: AllocationCapacityStatus, barPercent: number): string {
    if (status === 'allocated') return `${barPercent}% assigned`;
    return `${barPercent}% free`;
}
