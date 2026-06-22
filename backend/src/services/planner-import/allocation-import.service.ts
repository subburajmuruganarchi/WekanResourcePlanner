import { Types } from 'mongoose';
import { ProjectAllocation } from '../../modules/allocations/allocation.model';
import { ProjectRoleEffort } from '../../modules/projects/project-role-effort.model';
import { WeeklyAllocationEntry } from '../../modules/weekly-allocations/weekly-allocation-entry.model';
import { AllocationImportRow } from './types/allocation-row.dto';
import { ImportContext } from './types/import-context.types';
import { SheetImportResult, SkippedRow } from './types/import-result.types';
import {
    SEED_TAG,
    HOURS_PER_WEEK,
    isDummyResource,
    projectCodeFromRow,
    upsertJobRole,
    upsertSkill,
} from './planner-import.utils';
import {
    ImportWriteOptions,
    mongooseSessionOpts,
    failOrSkipRow,
    IMPORT_BULK_CHUNK_SIZE,
} from './types/import-write.options';
import {
    ensureEmployeeForAllocationRow,
    resolveEmployeeForAllocationRow,
} from './allocation-employee-resolver';
import { CreatedByRole, WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';
import { structuredLogger } from '../../common/logger';

async function resolveAllocationEmployeeId(
    row: AllocationImportRow,
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId | null> {
    let employeeId = await resolveEmployeeForAllocationRow(row, ctx, writeOpts);
    if (!employeeId) {
        employeeId = await ensureEmployeeForAllocationRow(row, ctx, writeOpts);
    }
    return employeeId;
}

function allocationMetricsFromWeeklyHours(weeklyHours: AllocationImportRow['weeklyHours']) {
    const sorted = [...weeklyHours].sort(
        (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
    );
    const maxHours = sorted.reduce((max, week) => Math.max(max, week.hours), 0);
    return {
        startDate: sorted[0].weekStart,
        endDate: sorted[sorted.length - 1].weekStart,
        maxHours,
        percent: Math.min(100, Math.round((maxHours / HOURS_PER_WEEK) * 100)),
    };
}

function isActiveAllocationRow(row: AllocationImportRow): boolean {
    return (
        !row.activeFlag.toLowerCase().includes('not') &&
        !row.projectStatus.toLowerCase().includes('completed')
    );
}

export interface AllocationImportOutput extends SheetImportResult {
    allocationsUpserted: number;
    weeklyEntriesUpserted: number;
}

type PreparedAllocation = {
    identifier: string;
    projectId: Types.ObjectId;
    employeeId: Types.ObjectId;
    jobRoleId: Types.ObjectId;
    skillId?: Types.ObjectId;
    percent: number;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    allocationReason: string;
    weeklyHours: AllocationImportRow['weeklyHours'];
};

function allocationKey(projectId: Types.ObjectId, employeeId: Types.ObjectId): string {
    return `${projectId.toString()}:${employeeId.toString()}`;
}

async function bulkWriteChunked<T extends Parameters<typeof ProjectAllocation.bulkWrite>[0]>(
    model: { bulkWrite: typeof ProjectAllocation.bulkWrite },
    ops: T,
    sessionOpts: ReturnType<typeof mongooseSessionOpts>,
    chunkSize = IMPORT_BULK_CHUNK_SIZE
): Promise<{ upserted: number; modified: number; matched: number }> {
    let upserted = 0;
    let modified = 0;
    let matched = 0;
    for (let i = 0; i < ops.length; i += chunkSize) {
        const chunk = ops.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;
        const result = await model.bulkWrite(chunk, { ordered: true, ...sessionOpts });
        upserted += result.upsertedCount ?? 0;
        modified += result.modifiedCount ?? 0;
        matched += result.matchedCount ?? 0;
    }
    return { upserted, modified, matched };
}

/** Upserts count as acknowledged when inserted or matched (unchanged updates still match). */
function bulkWriteAcknowledged(result: { upserted: number; matched: number }): number {
    return result.upserted + result.matched;
}

export async function importAllocationRows(
    rows: AllocationImportRow[],
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<AllocationImportOutput> {
    if (writeOpts?.atomic) {
        return importAllocationRowsBulk(rows, ctx, writeOpts);
    }
    return importAllocationRowsSequential(rows, ctx, writeOpts);
}

/** Upsert job roles outside MongoDB transaction. */
export async function prepareAllocationImportReferences(
    rows: AllocationImportRow[],
    ctx: ImportContext
): Promise<void> {
    const refOpts: ImportWriteOptions = { atomic: true };
    if (![...ctx.skillCache.values()].find((id): id is Types.ObjectId => !!id)) {
        const general = await upsertSkill('General', 'General', refOpts);
        if (general) ctx.skillCache.set('General', general);
    }
    for (const row of rows) {
        const roleName = row.jobRole || 'Consultant';
        if (!ctx.jobRoleIds.has(roleName)) {
            ctx.jobRoleIds.set(roleName, await upsertJobRole(roleName, refOpts));
        }
    }
}

async function importAllocationRowsBulk(
    rows: AllocationImportRow[],
    ctx: ImportContext,
    writeOpts: ImportWriteOptions
): Promise<AllocationImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const sessionOpts = mongooseSessionOpts(writeOpts);
    const startedAt = Date.now();

    structuredLogger.info('ALLOCATION IMPORT START', {
        rowsReceived: rows.length,
        syncBatchId: ctx.syncBatchId,
        syncId: ctx.syncId,
        atomic: true,
    });

    let defaultSkillId = [...ctx.skillCache.values()].find((id): id is Types.ObjectId => !!id);

    const prepared: PreparedAllocation[] = [];

    for (const row of rows) {
        const identifier = `${row.pid}:${row.employeeCode}` || row.projectName;

        if (!row.projectName) {
            failOrSkipRow(writeOpts, skippedRows, identifier, 'Missing project name');
            continue;
        }
        if (isDummyResource(row.resourceName, row.employeeCode)) {
            continue;
        }

        const code = ctx.projectByPid.get(row.pid) || projectCodeFromRow(row.pid, row.projectName);
        const projectId = ctx.projectByCode.get(code);
        if (!projectId) {
            failOrSkipRow(writeOpts, skippedRows, identifier, `Project not found for code ${code}`);
            continue;
        }

        let employeeId = await resolveAllocationEmployeeId(row, ctx, writeOpts);
        if (!employeeId) {
            failOrSkipRow(
                writeOpts,
                skippedRows,
                identifier,
                `Employee not found for EID ${row.employeeCode}`
            );
            continue;
        }

        if (row.weeklyHours.length === 0) {
            failOrSkipRow(writeOpts, skippedRows, identifier, 'No week columns in row');
            continue;
        }

        const jobRoleId = ctx.jobRoleIds.get(row.jobRole || 'Consultant');
        if (!jobRoleId) {
            throw new Error(`Job role not prepared: ${row.jobRole || 'Consultant'}`);
        }

        const { startDate, endDate, maxHours, percent } = allocationMetricsFromWeeklyHours(
            row.weeklyHours
        );
        const isActive = isActiveAllocationRow(row);
        const skillId = ctx.employeePrimarySkill.get(employeeId.toString()) || defaultSkillId;

        prepared.push({
            identifier,
            projectId,
            employeeId,
            jobRoleId,
            skillId,
            percent,
            startDate,
            endDate,
            isActive,
            allocationReason: `${SEED_TAG} from Project_Allocation (${maxHours}h/wk, ${row.resourceType || row.projectType})`,
            weeklyHours: row.weeklyHours,
        });
    }

    const allocationOps: Parameters<typeof ProjectAllocation.bulkWrite>[0] = prepared.map((p) => ({
        updateOne: {
            filter: { project_id: p.projectId, employee_id: p.employeeId },
            update: {
                $set: {
                    project_id: p.projectId,
                    employee_id: p.employeeId,
                    role_id: p.jobRoleId,
                    ...(p.skillId ? { skill_id: p.skillId } : {}),
                    start_date: p.startDate,
                    end_date: p.endDate,
                    allocation_percent: p.percent,
                    is_active: p.isActive,
                    ...(ctx.syncBatchId ? { last_sync_batch_id: ctx.syncBatchId } : {}),
                    allocation_reason: p.allocationReason,
                    created_by_role: CreatedByRole.ADMIN,
                },
            },
            upsert: true,
        },
    }));

    structuredLogger.info('ALLOCATION BULK WRITE START', {
        syncBatchId: ctx.syncBatchId,
        allocationOps: allocationOps.length,
    });

    const allocWriteStart = Date.now();
    const allocWriteResult = await bulkWriteChunked(
        ProjectAllocation,
        allocationOps,
        sessionOpts
    );

    const allocAcknowledged = bulkWriteAcknowledged(allocWriteResult);
    if (allocAcknowledged !== prepared.length) {
        throw new Error(
            `Allocation bulkWrite mismatch: expected ${prepared.length}, got ${allocAcknowledged}`
        );
    }

    let allocQuery = ProjectAllocation.find({
        $or: prepared.map((p) => ({
            project_id: p.projectId,
            employee_id: p.employeeId,
        })),
    }).select('_id project_id employee_id');
    if (writeOpts.session) {
        allocQuery = allocQuery.session(writeOpts.session);
    }
    const allocationDocs = await allocQuery.lean();

    const allocationIdByKey = new Map(
        allocationDocs.map((a) => [
            allocationKey(a.project_id as Types.ObjectId, a.employee_id as Types.ObjectId),
            a._id as Types.ObjectId,
        ])
    );

    const weeklyOps: Parameters<typeof WeeklyAllocationEntry.bulkWrite>[0] = [];
    const roleEffortByKey = new Map<string, Parameters<typeof ProjectRoleEffort.bulkWrite>[0][0]>();

    for (const p of prepared) {
        const allocId = allocationIdByKey.get(allocationKey(p.projectId, p.employeeId));
        if (!allocId) {
            throw new Error(`${p.identifier}: allocation upsert did not persist`);
        }

        for (const week of p.weeklyHours) {
            if (week.hours <= 0) continue;
            weeklyOps.push({
                updateOne: {
                    filter: {
                        employee_id: p.employeeId,
                        project_id: p.projectId,
                        week_start: week.weekStart,
                    },
                    update: {
                        $set: {
                            allocation_id: allocId,
                            employee_id: p.employeeId,
                            project_id: p.projectId,
                            week_start: week.weekStart,
                            planned_hours: week.hours,
                            actual_hours: 0,
                            forecast_hours: week.hours,
                            variance_hours: week.hours,
                            source: WeeklyAllocationSource.PLANNED,
                            status: WeeklyAllocationStatus.PUBLISHED,
                        },
                    },
                    upsert: true,
                },
            });
        }

        const roleKey = `${p.projectId.toString()}:${p.jobRoleId.toString()}`;
        if (!roleEffortByKey.has(roleKey)) {
            roleEffortByKey.set(roleKey, {
                updateOne: {
                    filter: { project_id: p.projectId, role_id: p.jobRoleId },
                    update: {
                        $set: {
                            project_id: p.projectId,
                            role_id: p.jobRoleId,
                            required_headcount: 1,
                            required_days: 60,
                            start_date: p.startDate,
                            end_date: p.endDate,
                            hours_per_day: 8,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }

    const roleEffortOps = [...roleEffortByKey.values()];
    let weeklyWriteCount = 0;

    if (weeklyOps.length > 0) {
        const weeklyResult = await bulkWriteChunked(
            WeeklyAllocationEntry,
            weeklyOps,
            sessionOpts
        );
        weeklyWriteCount = bulkWriteAcknowledged(weeklyResult);
        if (weeklyWriteCount !== weeklyOps.length) {
            throw new Error(
                `Weekly allocation bulkWrite mismatch: expected ${weeklyOps.length}, got ${weeklyWriteCount}`
            );
        }
    }

    if (roleEffortOps.length > 0) {
        await bulkWriteChunked(ProjectRoleEffort, roleEffortOps, sessionOpts);
    }

    structuredLogger.info('ALLOCATION BULK WRITE COMPLETE', {
        syncBatchId: ctx.syncBatchId,
        allocationsUpserted: prepared.length,
        weeklyOps: weeklyOps.length,
        roleEffortOps: roleEffortOps.length,
        durationMs: Date.now() - allocWriteStart,
        totalDurationMs: Date.now() - startedAt,
    });

    if (ctx.syncBatchId && !writeOpts?.deferStaleCleanup) {
        await deactivateStaleAllocations(ctx.syncBatchId, writeOpts);
    }

    return {
        rowsReceived: rows.length,
        rowsProcessed: prepared.length,
        rowsSkipped: skippedRows.length,
        skippedRows,
        errors: [],
        allocationsUpserted: prepared.length,
        weeklyEntriesUpserted: weeklyOps.length,
    };
}

async function importAllocationRowsSequential(
    rows: AllocationImportRow[],
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<AllocationImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    let allocationsUpserted = 0;
    let weeklyEntriesUpserted = 0;
    const sessionOpts = mongooseSessionOpts(writeOpts);
    const weeklyBulkOps: Parameters<typeof WeeklyAllocationEntry.bulkWrite>[0] = [];

    structuredLogger.info('ALLOCATION IMPORT START', {
        rowsReceived: rows.length,
        syncBatchId: ctx.syncBatchId,
        atomic: false,
    });

    const flushWeeklyBulk = async (): Promise<void> => {
        if (weeklyBulkOps.length === 0) return;
        await WeeklyAllocationEntry.bulkWrite(weeklyBulkOps, {
            ordered: true,
            ...sessionOpts,
        });
        weeklyBulkOps.length = 0;
    };

    let defaultSkillId = [...ctx.skillCache.values()].find((id): id is Types.ObjectId => !!id);
    if (!defaultSkillId) {
        defaultSkillId = await upsertSkill('General', 'General', writeOpts);
    }

    for (const row of rows) {
        const identifier = `${row.pid}:${row.employeeCode}` || row.projectName;

        if (!row.projectName) {
            failOrSkipRow(writeOpts, skippedRows, identifier, 'Missing project name');
            continue;
        }
        if (isDummyResource(row.resourceName, row.employeeCode)) {
            continue;
        }

        const code = ctx.projectByPid.get(row.pid) || projectCodeFromRow(row.pid, row.projectName);
        const projectId = ctx.projectByCode.get(code);
        if (!projectId) {
            failOrSkipRow(writeOpts, skippedRows, identifier, `Project not found for code ${code}`);
            continue;
        }

        let employeeId = await resolveAllocationEmployeeId(row, ctx, writeOpts);
        if (!employeeId) {
            failOrSkipRow(
                writeOpts,
                skippedRows,
                identifier,
                `Employee not found for EID ${row.employeeCode}`
            );
            continue;
        }

        if (row.weeklyHours.length === 0) {
            failOrSkipRow(writeOpts, skippedRows, identifier, 'No week columns in row');
            continue;
        }

        try {
            let jobRoleId = ctx.jobRoleIds.get(row.jobRole);
            if (!jobRoleId) {
                jobRoleId = await upsertJobRole(row.jobRole || 'Consultant', writeOpts);
                ctx.jobRoleIds.set(row.jobRole, jobRoleId);
            }

            const { startDate, endDate, maxHours, percent } = allocationMetricsFromWeeklyHours(
                row.weeklyHours
            );
            const isActive = isActiveAllocationRow(row);
            const skillId = ctx.employeePrimarySkill.get(employeeId.toString()) || defaultSkillId;

            const allocationDoc = await ProjectAllocation.findOneAndUpdate(
                { project_id: projectId, employee_id: employeeId },
                {
                    $set: {
                        project_id: projectId,
                        employee_id: employeeId,
                        role_id: jobRoleId,
                        ...(skillId ? { skill_id: skillId } : {}),
                        start_date: startDate,
                        end_date: endDate,
                        allocation_percent: percent,
                        is_active: isActive,
                        ...(ctx.syncBatchId ? { last_sync_batch_id: ctx.syncBatchId } : {}),
                        allocation_reason: `${SEED_TAG} from Project_Allocation (${maxHours}h/wk, ${row.resourceType || row.projectType})`,
                        created_by_role: CreatedByRole.ADMIN,
                    },
                },
                { upsert: true, new: true, ...sessionOpts }
            );
            allocationsUpserted++;

            for (const week of row.weeklyHours) {
                if (week.hours <= 0) continue;
                weeklyBulkOps.push({
                    updateOne: {
                        filter: {
                            employee_id: employeeId,
                            project_id: projectId,
                            week_start: week.weekStart,
                        },
                        update: {
                            $set: {
                                allocation_id: allocationDoc!._id,
                                employee_id: employeeId,
                                project_id: projectId,
                                week_start: week.weekStart,
                                planned_hours: week.hours,
                                actual_hours: 0,
                                forecast_hours: week.hours,
                                variance_hours: week.hours,
                                source: WeeklyAllocationSource.PLANNED,
                                status: WeeklyAllocationStatus.PUBLISHED,
                            },
                        },
                        upsert: true,
                    },
                });
                weeklyEntriesUpserted++;

                if (weeklyBulkOps.length >= IMPORT_BULK_CHUNK_SIZE) {
                    await flushWeeklyBulk();
                }
            }

            await ProjectRoleEffort.findOneAndUpdate(
                { project_id: projectId, role_id: jobRoleId },
                {
                    $set: {
                        project_id: projectId,
                        role_id: jobRoleId,
                        required_headcount: 1,
                        required_days: 60,
                        start_date: startDate,
                        end_date: endDate,
                        hours_per_day: 8,
                    },
                },
                { upsert: true, ...sessionOpts }
            );
        } catch (err) {
            if (writeOpts?.atomic) throw err;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${identifier}: ${msg}`);
            skippedRows.push({ identifier, reason: msg });
        }
    }

    await flushWeeklyBulk();

    if (ctx.syncBatchId && !writeOpts?.deferStaleCleanup) {
        await deactivateStaleAllocations(ctx.syncBatchId, writeOpts);
    }

    return {
        rowsReceived: rows.length,
        rowsProcessed: allocationsUpserted,
        rowsSkipped: skippedRows.length,
        skippedRows,
        errors,
        allocationsUpserted,
        weeklyEntriesUpserted,
    };
}

export async function deactivateStaleAllocations(
    syncBatchId: string,
    writeOpts?: ImportWriteOptions
): Promise<void> {
    await ProjectAllocation.updateMany(
        {
            last_sync_batch_id: { $exists: true, $ne: syncBatchId },
            allocation_reason: { $regex: SEED_TAG },
        },
        { $set: { is_active: false } },
        mongooseSessionOpts(writeOpts)
    );
}
