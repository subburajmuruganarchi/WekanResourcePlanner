import { Types } from 'mongoose';
import { ProjectAllocation } from '../allocations/allocation.model';
import { WeeklyAllocationEntry } from './weekly-allocation-entry.model';
import { WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';
import { WeeklyCapacityEngine } from '../../services/weekly-capacity/weekly-capacity.engine';
import {
    endOfUtcWeek,
    listUtcWeekStarts,
    startOfUtcWeek,
    weekStartToIsoDate,
} from '../../common/utils/week.util';

/**
 * Compatibility layer: legacy project_allocations remain authoritative for
 * ranking, reports, and time-entry forecast until Phase 2 cutover.
 * This service materializes weekly rows without mutating legacy allocations.
 */
export class WeeklyAllocationSyncService {
    /**
     * Expand one active project_allocation into weekly planned rows for each
     * overlapping UTC week in [rangeStart, rangeEnd].
     */
    async materializeFromProjectAllocation(
        allocationId: string,
        rangeStart: Date,
        rangeEnd: Date,
        actorId?: Types.ObjectId
    ): Promise<number> {
        if (!Types.ObjectId.isValid(allocationId)) {
            throw new Error('Invalid allocation id');
        }

        const alloc = await ProjectAllocation.findById(allocationId).lean();
        if (!alloc || !alloc.is_active) return 0;

        const allocStart = startOfUtcWeek(new Date(alloc.start_date));
        const allocEnd = new Date(alloc.end_date);
        const windowStart = startOfUtcWeek(rangeStart);
        const windowEnd = startOfUtcWeek(rangeEnd);

        const effectiveStart = allocStart > windowStart ? allocStart : windowStart;
        const effectiveEnd = allocEnd < endOfUtcWeek(windowEnd) ? allocEnd : endOfUtcWeek(windowEnd);

        if (effectiveEnd < effectiveStart) return 0;

        const weeks = listUtcWeekStarts(effectiveStart, effectiveEnd);
        const plannedHours = WeeklyCapacityEngine.plannedHoursFromAllocationPercent(
            alloc.allocation_percent || 0
        );

        let upserted = 0;
        for (const weekStart of weeks) {
            await WeeklyAllocationEntry.findOneAndUpdate(
                {
                    employee_id: alloc.employee_id,
                    project_id: alloc.project_id,
                    week_start: weekStart,
                },
                {
                    $set: {
                        allocation_id: alloc._id,
                        employee_id: alloc.employee_id,
                        project_id: alloc.project_id,
                        week_start: weekStart,
                        planned_hours: plannedHours,
                        source: WeeklyAllocationSource.LEGACY_SYNC,
                        status: WeeklyAllocationStatus.PUBLISHED,
                        updated_by: actorId,
                    },
                    $setOnInsert: {
                        actual_hours: 0,
                        forecast_hours: plannedHours,
                        created_by: actorId,
                    },
                },
                { upsert: true, new: true }
            );
            upserted++;
        }
        return upserted;
    }

    /**
     * Read-time synthesis: build grid cells from legacy allocations when no weekly row exists.
     */
    buildLegacyGridCells(
        allocations: Array<{
            _id: Types.ObjectId;
            employee_id: Types.ObjectId;
            project_id: Types.ObjectId;
            allocation_percent: number;
            start_date: Date;
            end_date: Date;
        }>,
        weekStarts: Date[]
    ): Array<{
        allocationId: string;
        employeeId: string;
        projectId: string;
        weekStart: Date;
        plannedHours: number;
        forecastHours: number;
    }> {
        const cells: Array<{
            allocationId: string;
            employeeId: string;
            projectId: string;
            weekStart: Date;
            plannedHours: number;
            forecastHours: number;
        }> = [];

        for (const weekStart of weekStarts) {
            const weekEnd = endOfUtcWeek(weekStart);
            for (const alloc of allocations) {
                if (alloc.start_date <= weekEnd && alloc.end_date >= weekStart) {
                    const hours = WeeklyCapacityEngine.plannedHoursFromAllocationPercent(
                        alloc.allocation_percent || 0
                    );
                    cells.push({
                        allocationId: alloc._id.toString(),
                        employeeId: alloc.employee_id.toString(),
                        projectId: alloc.project_id.toString(),
                        weekStart,
                        plannedHours: hours,
                        forecastHours: hours,
                    });
                }
            }
        }
        return cells;
    }

    /** Map legacy key for deduping with persisted weekly rows. */
    static cellKey(employeeId: string, projectId: string, weekStart: Date): string {
        return `${employeeId}:${projectId}:${weekStartToIsoDate(weekStart)}`;
    }
}

export const weeklyAllocationSyncService = new WeeklyAllocationSyncService();
