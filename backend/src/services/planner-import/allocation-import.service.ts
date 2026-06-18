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
import { ImportWriteOptions, mongooseSessionOpts, failOrSkipRow } from './types/import-write.options';
import { CreatedByRole, WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';

const WEEKLY_BULK_FLUSH_SIZE = 500;

export interface AllocationImportOutput extends SheetImportResult {
    allocationsUpserted: number;
    weeklyEntriesUpserted: number;
}

export async function importAllocationRows(
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
            failOrSkipRow(writeOpts, skippedRows, identifier, 'Dummy resource row');
            continue;
        }

        const code = ctx.projectByPid.get(row.pid) || projectCodeFromRow(row.pid, row.projectName);
        const projectId = ctx.projectByCode.get(code);
        if (!projectId) {
            failOrSkipRow(writeOpts, skippedRows, identifier, `Project not found for code ${code}`);
            continue;
        }

        let employeeId = ctx.employeeByCode.get(row.employeeCode);
        if (!employeeId) {
            const emailGuess = [...ctx.employeeByEmail.keys()].find((e) =>
                e.startsWith(row.resourceName.split(' ')[0].toLowerCase())
            );
            if (emailGuess) employeeId = ctx.employeeByEmail.get(emailGuess);
        }
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
            failOrSkipRow(writeOpts, skippedRows, identifier, 'No weekly hours');
            continue;
        }

        try {
            let jobRoleId = ctx.jobRoleIds.get(row.jobRole);
            if (!jobRoleId) {
                jobRoleId = await upsertJobRole(row.jobRole || 'Consultant', writeOpts);
                ctx.jobRoleIds.set(row.jobRole, jobRoleId);
            }

            const latest = row.weeklyHours[row.weeklyHours.length - 1];
            const percent = Math.min(100, Math.round((latest.hours / HOURS_PER_WEEK) * 100));
            const startDate = row.weeklyHours[0].weekStart;
            const endDate = row.weeklyHours[row.weeklyHours.length - 1].weekStart;
            const isActive =
                !row.activeFlag.toLowerCase().includes('not') &&
                !row.projectStatus.toLowerCase().includes('completed') &&
                percent > 0;
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
                        allocation_reason: `${SEED_TAG} from Project_Allocation (${latest.hours}h/wk, ${row.resourceType || row.projectType})`,
                        created_by_role: CreatedByRole.ADMIN,
                    },
                },
                { upsert: true, new: true, ...sessionOpts }
            );
            allocationsUpserted++;

            for (const week of row.weeklyHours) {
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

                if (weeklyBulkOps.length >= WEEKLY_BULK_FLUSH_SIZE) {
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

    if (ctx.syncBatchId) {
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

async function deactivateStaleAllocations(
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
