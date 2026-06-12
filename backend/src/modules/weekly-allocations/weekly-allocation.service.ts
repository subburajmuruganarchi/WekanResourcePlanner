import { Types, startSession } from 'mongoose';
import { features } from '../../config/features';
import { AppError } from '../../common/errors/app-error';
import { WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';
import {
    assertWeekRangeWithinLimit,
    endOfUtcWeek,
    listUtcWeekStarts,
    parseWeekStartParam,
    startOfUtcWeek,
    weekStartToIsoDate,
} from '../../common/utils/week.util';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { WeeklyAllocationEntry, IWeeklyAllocationEntry } from './weekly-allocation-entry.model';
import {
    EmployeeWeekCapacityDto,
    WeeklyAllocationEntryDto,
    WeeklyGridBulkUpdateResult,
    WeeklyGridQuery,
    WeeklyGridResponse,
    WeeklyGridBulkUpdateItem,
} from './weekly-allocation.types';
import { WeeklyGridPutBodyInput } from './weekly-allocation.validators';
import { weeklyAllocationSyncService, WeeklyAllocationSyncService } from './weekly-allocation-sync.service';
import {
    WeeklyCapacityEngine,
    WeeklyHourCell,
    weeklyCapacityEngine,
} from '../../services/weekly-capacity/weekly-capacity.engine';

/** Synthetic bench row — display-only; bulk save rejects this project id. */
const UNASSIGNED_BENCH_PROJECT_ID = '000000000000000000000000001';
const UNASSIGNED_BENCH_PROJECT_NAME = 'Available / Bench';
const UNASSIGNED_BENCH_PROJECT_CODE = 'BENCH';

export class WeeklyAllocationService {
    private static pivotRowKey(employeeId: string, projectId: string): string {
        return `${employeeId}:${projectId}`;
    }

    private createSyntheticEmptyCell(
        employeeId: string,
        projectId: string,
        weekStart: string,
        names?: { employeeName?: string; projectName?: string; projectCode?: string }
    ): WeeklyAllocationEntryDto {
        return {
            id: `empty:${employeeId}:${projectId}:${weekStart}`,
            employeeId,
            projectId,
            employeeName: names?.employeeName,
            projectName: names?.projectName,
            projectCode: names?.projectCode,
            weekStart,
            plannedHours: 0,
            actualHours: 0,
            forecastHours: 0,
            varianceHours: 0,
            deltaHours: 0,
            variancePercent: 0,
            source: WeeklyAllocationSource.PLANNED,
            status: WeeklyAllocationStatus.DRAFT,
        };
    }
    private mapEntryToDto(
        doc: IWeeklyAllocationEntry,
        names?: { employeeName?: string; projectName?: string; projectCode?: string }
    ): WeeklyAllocationEntryDto {
        return {
            id: doc._id.toString(),
            allocationId: doc.allocation_id?.toString(),
            employeeId: doc.employee_id.toString(),
            employeeName: names?.employeeName,
            projectId: doc.project_id.toString(),
            projectName: names?.projectName,
            projectCode: names?.projectCode,
            weekStart: weekStartToIsoDate(doc.week_start),
            plannedHours: doc.planned_hours,
            actualHours: doc.actual_hours,
            forecastHours: doc.forecast_hours,
            varianceHours: doc.variance_hours ?? WeeklyCapacityEngine.computeVarianceHours(doc.planned_hours, doc.actual_hours),
            deltaHours: weeklyCapacityEngine.actualMinusPlannedVariance(doc.planned_hours, doc.actual_hours),
            variancePercent: weeklyCapacityEngine.variancePercent(doc.planned_hours, doc.actual_hours),
            actualsSyncedAt: doc.actuals_synced_at?.toISOString(),
            source: doc.source,
            status: doc.status,
            createdAt: doc.created_at?.toISOString(),
            updatedAt: doc.updated_at?.toISOString(),
        };
    }

    async getGrid(query: WeeklyGridQuery): Promise<WeeklyGridResponse> {
        const weekFrom = startOfUtcWeek(query.weekStartFrom);
        const weekTo = startOfUtcWeek(query.weekStartTo);
        assertWeekRangeWithinLimit(weekFrom, weekTo);

        const weeks = listUtcWeekStarts(weekFrom, weekTo);
        const weekIsoList = weeks.map(weekStartToIsoDate);

        const entryFilter: Record<string, unknown> = {
            week_start: { $gte: weekFrom, $lte: weekTo },
        };
        if (query.employeeIds?.length) {
            entryFilter.employee_id = { $in: query.employeeIds.map((id) => new Types.ObjectId(id)) };
        }
        if (query.projectIds?.length) {
            entryFilter.project_id = { $in: query.projectIds.map((id) => new Types.ObjectId(id)) };
        }

        const MAX_MERGED_ROWS = 5000;

        const entries = await WeeklyAllocationEntry.find(entryFilter)
            .sort({ week_start: 1, employee_id: 1, project_id: 1 })
            .limit(MAX_MERGED_ROWS)
            .lean();

        const rowMap = new Map<string, WeeklyAllocationEntryDto>();

        const employeeIds = new Set<string>();
        const projectIds = new Set<string>();
        for (const e of entries) {
            employeeIds.add(e.employee_id.toString());
            projectIds.add(e.project_id.toString());
            const key = WeeklyAllocationSyncService.cellKey(
                e.employee_id.toString(),
                e.project_id.toString(),
                e.week_start
            );
            rowMap.set(
                key,
                this.mapEntryToDto({
                    _id: e._id,
                    employee_id: e.employee_id,
                    project_id: e.project_id,
                    week_start: e.week_start,
                    planned_hours: e.planned_hours,
                    actual_hours: e.actual_hours,
                    forecast_hours: e.forecast_hours,
                    source: e.source,
                    status: e.status,
                    allocation_id: e.allocation_id,
                    created_at: e.created_at,
                    updated_at: e.updated_at,
                } as IWeeklyAllocationEntry)
            );
        }

        if (features.weeklyAllocationsLegacyRead) {
            const legacyFilter: Record<string, unknown> = {
                is_active: true,
                start_date: { $lte: endOfUtcWeek(weekTo) },
                end_date: { $gte: weekFrom },
            };
            if (query.employeeIds?.length) {
                legacyFilter.employee_id = {
                    $in: query.employeeIds.map((id) => new Types.ObjectId(id)),
                };
            }
            if (query.projectIds?.length) {
                legacyFilter.project_id = {
                    $in: query.projectIds.map((id) => new Types.ObjectId(id)),
                };
            }

            const legacyAllocs = await ProjectAllocation.find(legacyFilter).lean();
            const synthesized = weeklyAllocationSyncService.buildLegacyGridCells(
                legacyAllocs,
                weeks
            );

            for (const cell of synthesized) {
                const key = WeeklyAllocationSyncService.cellKey(
                    cell.employeeId,
                    cell.projectId,
                    cell.weekStart
                );
                if (rowMap.has(key)) continue;

                const planned = cell.plannedHours;
                const actual = 0;
                rowMap.set(key, {
                    id: `legacy:${key}`,
                    allocationId: cell.allocationId,
                    employeeId: cell.employeeId,
                    projectId: cell.projectId,
                    weekStart: weekStartToIsoDate(cell.weekStart),
                    plannedHours: planned,
                    actualHours: actual,
                    forecastHours: cell.forecastHours,
                    varianceHours: WeeklyCapacityEngine.computeVarianceHours(planned, actual),
                    deltaHours: weeklyCapacityEngine.actualMinusPlannedVariance(planned, actual),
                    variancePercent: weeklyCapacityEngine.variancePercent(planned, actual),
                    source: WeeklyAllocationSource.LEGACY_SYNC,
                    status: WeeklyAllocationStatus.PUBLISHED,
                });
                employeeIds.add(cell.employeeId);
                projectIds.add(cell.projectId);
            }
        }

        // Group flat cells into employee × project pivot rows.
        const pivotMap = new Map<string, Map<string, WeeklyAllocationEntryDto>>();
        for (const cell of rowMap.values()) {
            const pivotKey = WeeklyAllocationService.pivotRowKey(cell.employeeId, cell.projectId);
            const weekMap = pivotMap.get(pivotKey) ?? new Map<string, WeeklyAllocationEntryDto>();
            weekMap.set(cell.weekStart, cell);
            pivotMap.set(pivotKey, weekMap);
        }

        // Include active employees with no allocation in the selected range (bench row).
        if (!query.projectIds?.length) {
            const activeEmployeeFilter: Record<string, unknown> = {
                $or: [{ is_active: true }, { status: 'Active' }],
                status: { $nin: ['Terminated', 'Inactive'] },
            };
            if (query.employeeIds?.length) {
                activeEmployeeFilter._id = {
                    $in: query.employeeIds.map((id) => new Types.ObjectId(id)),
                };
            }

            const activeEmployees = await Employee.find(activeEmployeeFilter)
                .select('first_name last_name')
                .lean();

            const employeesWithRows = new Set(
                [...pivotMap.keys()].map((key) => key.split(':')[0])
            );

            for (const emp of activeEmployees) {
                const empId = emp._id.toString();
                if (employeesWithRows.has(empId)) continue;

                const pivotKey = WeeklyAllocationService.pivotRowKey(
                    empId,
                    UNASSIGNED_BENCH_PROJECT_ID
                );
                const weekMap = new Map<string, WeeklyAllocationEntryDto>();
                for (const weekIso of weekIsoList) {
                    weekMap.set(
                        weekIso,
                        this.createSyntheticEmptyCell(
                            empId,
                            UNASSIGNED_BENCH_PROJECT_ID,
                            weekIso,
                            {
                                employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
                                projectName: UNASSIGNED_BENCH_PROJECT_NAME,
                                projectCode: UNASSIGNED_BENCH_PROJECT_CODE,
                            }
                        )
                    );
                }
                pivotMap.set(pivotKey, weekMap);
                employeeIds.add(empId);
                projectIds.add(UNASSIGNED_BENCH_PROJECT_ID);
            }
        }

        const [employees, projects] = await Promise.all([
            Employee.find({ _id: { $in: [...employeeIds] } })
                .select('first_name last_name')
                .lean(),
            Project.find({ _id: { $in: [...projectIds].filter((id) => id !== UNASSIGNED_BENCH_PROJECT_ID) } })
                .select('project_name project_code')
                .lean(),
        ]);

        const empNameById = new Map(
            employees.map((e) => [e._id.toString(), `${e.first_name} ${e.last_name}`.trim()])
        );
        const projById = new Map(
            projects.map((p) => [
                p._id.toString(),
                { name: p.project_name, code: p.project_code },
            ])
        );
        projById.set(UNASSIGNED_BENCH_PROJECT_ID, {
            name: UNASSIGNED_BENCH_PROJECT_NAME,
            code: UNASSIGNED_BENCH_PROJECT_CODE,
        });

        const sortedPivotKeys = [...pivotMap.keys()].sort((a, b) => {
            const [empA, projA] = a.split(':');
            const [empB, projB] = b.split(':');
            const e = (empNameById.get(empA) || empA).localeCompare(empNameById.get(empB) || empB);
            if (e !== 0) return e;
            const projNameA =
                projById.get(projA)?.name ||
                (projA === UNASSIGNED_BENCH_PROJECT_ID ? UNASSIGNED_BENCH_PROJECT_NAME : projA);
            const projNameB =
                projById.get(projB)?.name ||
                (projB === UNASSIGNED_BENCH_PROJECT_ID ? UNASSIGNED_BENCH_PROJECT_NAME : projB);
            return projNameA.localeCompare(projNameB);
        });

        const totalPivotRows = sortedPivotKeys.length;
        const skip = (query.page - 1) * query.limit;
        const paginatedPivotKeys = sortedPivotKeys.slice(skip, skip + query.limit);

        const enrichCell = (cell: WeeklyAllocationEntryDto): WeeklyAllocationEntryDto => ({
            ...cell,
            employeeName: cell.employeeName ?? empNameById.get(cell.employeeId),
            projectName:
                cell.projectName ??
                projById.get(cell.projectId)?.name ??
                (cell.projectId === UNASSIGNED_BENCH_PROJECT_ID
                    ? UNASSIGNED_BENCH_PROJECT_NAME
                    : undefined),
            projectCode:
                cell.projectCode ??
                projById.get(cell.projectId)?.code ??
                (cell.projectId === UNASSIGNED_BENCH_PROJECT_ID
                    ? UNASSIGNED_BENCH_PROJECT_CODE
                    : undefined),
        });

        const expandPivotKeys = (keys: string[]): WeeklyAllocationEntryDto[] => {
            const expanded: WeeklyAllocationEntryDto[] = [];
            for (const pivotKey of keys) {
                const [employeeId, projectId] = pivotKey.split(':');
                const weekMap = pivotMap.get(pivotKey)!;
                const names = {
                    employeeName: empNameById.get(employeeId),
                    projectName:
                        projById.get(projectId)?.name ??
                        (projectId === UNASSIGNED_BENCH_PROJECT_ID
                            ? UNASSIGNED_BENCH_PROJECT_NAME
                            : undefined),
                    projectCode:
                        projById.get(projectId)?.code ??
                        (projectId === UNASSIGNED_BENCH_PROJECT_ID
                            ? UNASSIGNED_BENCH_PROJECT_CODE
                            : undefined),
                };
                for (const weekIso of weekIsoList) {
                    const cell =
                        weekMap.get(weekIso) ??
                        this.createSyntheticEmptyCell(employeeId, projectId, weekIso, names);
                    expanded.push(enrichCell(cell));
                }
            }
            return expanded;
        };

        const allRows = expandPivotKeys(sortedPivotKeys);
        const paginatedRows = expandPivotKeys(paginatedPivotKeys);

        const response: WeeklyGridResponse = {
            weeks: weekIsoList,
            rows: paginatedRows,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: totalPivotRows,
                totalPages: Math.ceil(totalPivotRows / query.limit) || 1,
            },
        };

        if (query.includeCapacitySummary) {
            response.capacityByEmployeeWeek = this.buildCapacitySummary(allRows);
        }

        return response;
    }

    private metricsToCapacityDto(m: import('../../services/weekly-capacity/weekly-capacity.engine').EmployeeWeekMetrics): EmployeeWeekCapacityDto {
        return {
            employeeId: m.employeeId,
            weekStart: m.weekStart,
            capacityHours: m.capacityHours,
            committedHours: m.committedHours,
            availableHours: m.availableHours,
            utilizationPercent: m.utilizationPercent,
            benchPercent: m.benchPercent,
            isOverAllocated: m.isOverAllocated,
            plannedHours: m.plannedHours,
            actualHours: m.actualHours,
            forecastHours: m.forecastHours,
            varianceHours: m.planVarianceHours,
            planVarianceHours: m.planVarianceHours,
            deltaHours: m.varianceHours,
            actualUtilizationPercent: m.actualUtilizationPercent,
            plannedUtilizationPercent: m.plannedUtilizationPercent,
            variancePercent: m.variancePercent,
            forecastAccuracyPercent: m.forecastAccuracyPercent,
        };
    }

    private buildCapacitySummary(rows: WeeklyAllocationEntryDto[]): EmployeeWeekCapacityDto[] {
        const byEmpWeek = new Map<string, WeeklyHourCell[]>();
        const employeeNameByKey = new Map<string, string>();

        for (const row of rows) {
            const key = `${row.employeeId}:${row.weekStart}`;
            const cells = byEmpWeek.get(key) ?? [];
            cells.push({
                projectId: row.projectId,
                plannedHours: row.plannedHours,
                actualHours: row.actualHours,
                forecastHours: row.forecastHours,
            });
            byEmpWeek.set(key, cells);
            if (row.employeeName && !employeeNameByKey.has(key)) {
                employeeNameByKey.set(key, row.employeeName);
            }
        }

        const summaries: EmployeeWeekCapacityDto[] = [];
        for (const [key, cells] of byEmpWeek) {
            const [employeeId, weekStart] = key.split(':');
            const m = weeklyCapacityEngine.computeEmployeeWeek({ employeeId, weekStart, cells });
            summaries.push({
                ...this.metricsToCapacityDto(m),
                employeeName: employeeNameByKey.get(key),
            });
        }

        return summaries.sort(
            (a, b) =>
                Number(b.isOverAllocated) - Number(a.isOverAllocated) ||
                b.committedHours - a.committedHours
        );
    }

    async bulkUpdateGrid(
        body: WeeklyGridPutBodyInput,
        actorId?: string
    ): Promise<WeeklyGridBulkUpdateResult> {
        const validateCapacity =
            body.validateCapacity ?? features.weeklyAllocationsValidateCapacity;
        const allowOverAllocation = body.allowOverAllocation ?? false;

        const rejected: { index: number; reason: string }[] = [];
        const actorOid =
            actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : undefined;

        const updatesByEmpWeek = new Map<
            string,
            { cells: WeeklyHourCell[]; updates: WeeklyGridBulkUpdateItem[] }
        >();

        for (let i = 0; i < body.updates.length; i++) {
            const item = body.updates[i];
            if (item.projectId === UNASSIGNED_BENCH_PROJECT_ID) {
                rejected.push({
                    index: i,
                    reason: 'Assign a project before entering hours on an Available / Bench row',
                });
                continue;
            }
            if (!Types.ObjectId.isValid(item.employeeId) || !Types.ObjectId.isValid(item.projectId)) {
                rejected.push({ index: i, reason: 'Invalid employeeId or projectId' });
                continue;
            }
            let weekStart: Date;
            try {
                weekStart = startOfUtcWeek(parseWeekStartParam(item.weekStart));
            } catch {
                rejected.push({ index: i, reason: 'Invalid weekStart' });
                continue;
            }

            const key = `${item.employeeId}:${weekStartToIsoDate(weekStart)}`;
            const bucket = updatesByEmpWeek.get(key) ?? { cells: [], updates: [] };
            bucket.updates.push(item);
            updatesByEmpWeek.set(key, bucket);
        }

        if (validateCapacity && !allowOverAllocation) {
            for (const [key, bucket] of updatesByEmpWeek) {
                const [employeeId, weekIso] = key.split(':');
                const weekStart = startOfUtcWeek(new Date(weekIso));

                const existing = await WeeklyAllocationEntry.find({
                    employee_id: new Types.ObjectId(employeeId),
                    week_start: weekStart,
                }).lean();

                const existingCells: WeeklyHourCell[] = existing.map((e) => ({
                    projectId: e.project_id.toString(),
                    plannedHours: e.planned_hours,
                    actualHours: e.actual_hours,
                    forecastHours: e.forecast_hours,
                }));

                const proposed = bucket.updates.map((u) => ({
                    projectId: u.projectId,
                    plannedHours:
                        u.plannedHours ??
                        existingCells.find((c) => c.projectId === u.projectId)?.plannedHours ??
                        0,
                }));

                const err = weeklyCapacityEngine.validateProposedWeek(existingCells, proposed);
                if (err) {
                    for (let i = 0; i < body.updates.length; i++) {
                        const u = body.updates[i];
                        if (
                            u.employeeId === employeeId &&
                            weekStartToIsoDate(startOfUtcWeek(parseWeekStartParam(u.weekStart))) === weekIso
                        ) {
                            rejected.push({ index: i, reason: err });
                        }
                    }
                }
            }
        }

        const accepted = body.updates.filter((_, idx) => !rejected.some((r) => r.index === idx));
        if (accepted.length === 0) {
            return {
                upserted: 0,
                modified: 0,
                rejected,
                capacityWarnings: [],
            };
        }

        const session = await startSession();
        session.startTransaction();

        let upserted = 0;
        let modified = 0;

        try {
            for (const item of accepted) {
                const weekStart = startOfUtcWeek(parseWeekStartParam(item.weekStart));
                const filter = {
                    employee_id: new Types.ObjectId(item.employeeId),
                    project_id: new Types.ObjectId(item.projectId),
                    week_start: weekStart,
                };

                const existing = await WeeklyAllocationEntry.findOne(filter).session(session);
                const setFields: Record<string, unknown> = {
                    updated_by: actorOid,
                };

                if (item.plannedHours !== undefined) setFields.planned_hours = item.plannedHours;
                if (item.actualHours !== undefined) setFields.actual_hours = item.actualHours;
                if (item.forecastHours !== undefined) setFields.forecast_hours = item.forecastHours;
                if (item.allocationId && Types.ObjectId.isValid(item.allocationId)) {
                    setFields.allocation_id = new Types.ObjectId(item.allocationId);
                }
                if (item.source) setFields.source = item.source;
                if (item.status) setFields.status = item.status;

                const planned =
                    item.plannedHours ?? existing?.planned_hours ?? 0;
                const actual = item.actualHours ?? existing?.actual_hours ?? 0;
                setFields.variance_hours = WeeklyCapacityEngine.computeVarianceHours(
                    planned,
                    actual
                );

                if (!existing) {
                    setFields.employee_id = filter.employee_id;
                    setFields.project_id = filter.project_id;
                    setFields.week_start = weekStart;
                    setFields.planned_hours = item.plannedHours ?? 0;
                    setFields.actual_hours = item.actualHours ?? 0;
                    setFields.forecast_hours = item.forecastHours ?? item.plannedHours ?? 0;
                    setFields.source = item.source ?? WeeklyAllocationSource.PLANNED;
                    setFields.status = item.status ?? WeeklyAllocationStatus.DRAFT;
                    setFields.created_by = actorOid;

                    await WeeklyAllocationEntry.create([setFields], { session });
                    upserted++;
                } else {
                    await WeeklyAllocationEntry.updateOne(filter, { $set: setFields }, { session });
                    modified++;
                }
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        const capacityWarnings: EmployeeWeekCapacityDto[] = [];
        if (validateCapacity) {
            const seen = new Set<string>();
            for (const item of accepted) {
                const weekIso = weekStartToIsoDate(startOfUtcWeek(parseWeekStartParam(item.weekStart)));
                const key = `${item.employeeId}:${weekIso}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const weekStart = startOfUtcWeek(parseWeekStartParam(item.weekStart));
                const entries = await WeeklyAllocationEntry.find({
                    employee_id: new Types.ObjectId(item.employeeId),
                    week_start: weekStart,
                }).lean();

                const metrics = weeklyCapacityEngine.computeEmployeeWeek({
                    employeeId: item.employeeId,
                    weekStart: weekIso,
                    cells: entries.map((e) => ({
                        projectId: e.project_id.toString(),
                        plannedHours: e.planned_hours,
                        actualHours: e.actual_hours,
                        forecastHours: e.forecast_hours,
                    })),
                });

                if (metrics.isOverAllocated) {
                    capacityWarnings.push(this.metricsToCapacityDto(metrics));
                }
            }
        }

        return { upserted, modified, rejected, capacityWarnings };
    }

    async assertEntitiesExist(employeeIds: string[], projectIds: string[]): Promise<void> {
        const uniqueEmployees = [...new Set(employeeIds)];
        const uniqueProjects = [...new Set(projectIds)];

        const [empCount, projCount] = await Promise.all([
            Employee.countDocuments({
                _id: { $in: uniqueEmployees.map((id) => new Types.ObjectId(id)) },
            }),
            Project.countDocuments({
                _id: { $in: uniqueProjects.map((id) => new Types.ObjectId(id)) },
            }),
        ]);

        if (empCount !== uniqueEmployees.length) {
            throw new AppError('One or more employees not found', 400);
        }
        if (projCount !== uniqueProjects.length) {
            throw new AppError('One or more projects not found', 400);
        }
    }
}

export const weeklyAllocationService = new WeeklyAllocationService();
