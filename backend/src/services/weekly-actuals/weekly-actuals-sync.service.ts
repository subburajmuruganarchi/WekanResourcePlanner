import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { TimeEntry } from '../../modules/time-entries/time-entry.model';
import { TimeEntryStatus } from '../../common/types/enums';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { WeeklyUtilizationSnapshot } from '../../modules/utilization/weekly-utilization-snapshot.model';
import { WeeklyUtilizationSnapshotType, WeeklyAllocationSource } from '../../common/types/enums';
import { features } from '../../config/features';
import { WeeklyCapacityEngine } from '../weekly-capacity/weekly-capacity.engine';
import { startOfUtcWeek, weekStartToIsoDate } from '../../common/utils/week.util';
import { structuredLogger } from '../../common/logger';

export interface ActualsSyncOptions {
    weekStartFrom: Date;
    weekStartTo: Date;
    employeeIds?: Types.ObjectId[];
    projectIds?: Types.ObjectId[];
    actorId?: Types.ObjectId;
    createSnapshots?: boolean;
}

export interface ActualsSyncResult {
    syncBatchId: string;
    weeksProcessed: number;
    cellsUpdated: number;
    cellsCreated: number;
    snapshotsWritten: number;
    aggregatedGroups: number;
}

interface ApprovedHoursGroup {
    employeeId: Types.ObjectId;
    projectId: Types.ObjectId;
    weekStart: Date;
    actualHours: number;
}

/**
 * Reconciles PM-approved time_entries into weekly_allocation_entries.actual_hours.
 *
 * Architecture:
 * - time_entries: source of truth for actuals (PM_Approved only)
 * - weekly_allocation_entries: planning grain (planned + materialized actual)
 * - project_allocations: legacy % spans; not mutated by this service
 */
export class WeeklyActualsSyncService {
    /**
     * Aggregate approved entries in range and upsert weekly cells.
     * Idempotent: re-running the same range overwrites actual_hours from current approvals.
     */
    async syncApprovedActuals(options: ActualsSyncOptions): Promise<ActualsSyncResult> {
        const syncBatchId = uuidv4();
        const weekFrom = startOfUtcWeek(options.weekStartFrom);
        const weekTo = startOfUtcWeek(options.weekStartTo);

        const match: Record<string, unknown> = {
            status: TimeEntryStatus.PM_APPROVED,
            weekStartDate: { $gte: weekFrom, $lte: weekTo },
        };
        if (options.employeeIds?.length) {
            match.employeeId = { $in: options.employeeIds };
        }
        if (options.projectIds?.length) {
            match.projectId = { $in: options.projectIds };
        }

        const aggregated = await TimeEntry.aggregate<{
            _id: { employeeId: Types.ObjectId; projectId: Types.ObjectId; weekStart: Date };
            actualHours: number;
        }>([
            { $match: match },
            {
                $group: {
                    _id: {
                        employeeId: '$employeeId',
                        projectId: '$projectId',
                        weekStart: '$weekStartDate',
                    },
                    actualHours: { $sum: '$hours' },
                },
            },
        ]);

        const groups: ApprovedHoursGroup[] = aggregated.map((row) => ({
            employeeId: row._id.employeeId,
            projectId: row._id.projectId,
            weekStart: startOfUtcWeek(row._id.weekStart),
            actualHours: Math.round(row.actualHours * 100) / 100,
        }));

        const now = new Date();
        let cellsUpdated = 0;
        let cellsCreated = 0;
        let snapshotsWritten = 0;

        for (const g of groups) {
            const existing = await WeeklyAllocationEntry.findOne({
                employee_id: g.employeeId,
                project_id: g.projectId,
                week_start: g.weekStart,
            });

            const planned = existing?.planned_hours ?? 0;
            const variance = WeeklyCapacityEngine.computeVarianceHours(planned, g.actualHours);

            const doc = await WeeklyAllocationEntry.findOneAndUpdate(
                {
                    employee_id: g.employeeId,
                    project_id: g.projectId,
                    week_start: g.weekStart,
                },
                {
                    $set: {
                        actual_hours: g.actualHours,
                        variance_hours: variance,
                        actuals_synced_at: now,
                        updated_by: options.actorId,
                        source: existing?.source ?? WeeklyAllocationSource.ACTUAL,
                    },
                    $setOnInsert: {
                        employee_id: g.employeeId,
                        project_id: g.projectId,
                        week_start: g.weekStart,
                        planned_hours: 0,
                        forecast_hours: g.actualHours,
                        created_by: options.actorId,
                    },
                },
                { upsert: true, new: true }
            );

            if (existing) cellsUpdated++;
            else cellsCreated++;

            if (
                options.createSnapshots !== false &&
                features.weeklyUtilizationSnapshots &&
                doc
            ) {
                snapshotsWritten += await this.writeSnapshotsForCell(
                    doc,
                    syncBatchId,
                    g.actualHours,
                    planned,
                    variance
                );
            }
        }

        const weekSet = new Set(groups.map((g) => weekStartToIsoDate(g.weekStart)));

        structuredLogger.info('Weekly actuals sync completed', {
            context: 'weekly-actuals-sync',
            syncBatchId,
            cellsUpdated,
            cellsCreated,
            aggregatedGroups: groups.length,
        });

        return {
            syncBatchId,
            weeksProcessed: weekSet.size,
            cellsUpdated,
            cellsCreated,
            snapshotsWritten,
            aggregatedGroups: groups.length,
        };
    }

    /** Incremental: sync weeks touched by specific approved entry IDs. */
    async syncForApprovedEntryIds(entryIds: string[], actorId?: Types.ObjectId): Promise<ActualsSyncResult | null> {
        if (!features.weeklyActualsSyncEnabled || entryIds.length === 0) return null;

        const ids = entryIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
        if (ids.length === 0) return null;

        const entries = await TimeEntry.find({
            _id: { $in: ids },
            status: TimeEntryStatus.PM_APPROVED,
        })
            .select('weekStartDate employeeId projectId')
            .lean();

        if (entries.length === 0) return null;

        let weekFrom = startOfUtcWeek(entries[0].weekStartDate);
        let weekTo = weekFrom;
        const employeeIds = new Set<string>();
        const projectIds = new Set<string>();

        for (const e of entries) {
            const w = startOfUtcWeek(e.weekStartDate);
            if (w < weekFrom) weekFrom = w;
            if (w > weekTo) weekTo = w;
            employeeIds.add(e.employeeId.toString());
            projectIds.add(e.projectId.toString());
        }

        return this.syncApprovedActuals({
            weekStartFrom: weekFrom,
            weekStartTo: weekTo,
            employeeIds: [...employeeIds].map((id) => new Types.ObjectId(id)),
            projectIds: [...projectIds].map((id) => new Types.ObjectId(id)),
            actorId,
        });
    }

    private async writeSnapshotsForCell(
        doc: {
            employee_id: Types.ObjectId;
            project_id: Types.ObjectId;
            week_start: Date;
            planned_hours: number;
            actual_hours: number;
            forecast_hours: number;
            variance_hours: number;
        },
        syncBatchId: string,
        actualHours: number,
        plannedHours: number,
        varianceHours: number
    ): Promise<number> {
        const base = {
            employee_id: doc.employee_id,
            project_id: doc.project_id,
            week_start: doc.week_start,
            sync_batch_id: syncBatchId,
        };

        const types: { type: WeeklyUtilizationSnapshotType; hours: number }[] = [
            { type: WeeklyUtilizationSnapshotType.PLANNED, hours: plannedHours },
            { type: WeeklyUtilizationSnapshotType.ACTUAL, hours: actualHours },
            { type: WeeklyUtilizationSnapshotType.VARIANCE, hours: varianceHours },
            { type: WeeklyUtilizationSnapshotType.FORECAST, hours: doc.forecast_hours },
        ];

        let written = 0;
        for (const t of types) {
            await WeeklyUtilizationSnapshot.findOneAndUpdate(
                { ...base, snapshot_type: t.type },
                { ...base, snapshot_type: t.type, hours: t.hours },
                { upsert: true }
            );
            written++;
        }
        return written;
    }
}

export const weeklyActualsSyncService = new WeeklyActualsSyncService();
