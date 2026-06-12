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
import { CreatedByRole, WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';

export interface AllocationImportOutput extends SheetImportResult {
    allocationsUpserted: number;
    weeklyEntriesUpserted: number;
}

export async function importAllocationRows(
    rows: AllocationImportRow[],
    ctx: ImportContext
): Promise<AllocationImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    let allocationsUpserted = 0;
    let weeklyEntriesUpserted = 0;

    let defaultSkillId = [...ctx.skillCache.values()].find((id): id is Types.ObjectId => !!id);
    if (!defaultSkillId) {
        defaultSkillId = await upsertSkill('General', 'General');
    }

    for (const row of rows) {
        const identifier = `${row.pid}:${row.employeeCode}` || row.projectName;

        if (!row.projectName) {
            skippedRows.push({ identifier, reason: 'Missing project name' });
            continue;
        }
        if (isDummyResource(row.resourceName, row.employeeCode)) {
            skippedRows.push({ identifier, reason: 'Dummy resource row' });
            continue;
        }

        const code = ctx.projectByPid.get(row.pid) || projectCodeFromRow(row.pid, row.projectName);
        const projectId = ctx.projectByCode.get(code);
        if (!projectId) {
            skippedRows.push({ identifier, reason: `Project not found for code ${code}` });
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
            skippedRows.push({ identifier, reason: `Employee not found for EID ${row.employeeCode}` });
            continue;
        }

        if (row.weeklyHours.length === 0) {
            skippedRows.push({ identifier, reason: 'No weekly hours' });
            continue;
        }

        try {
            let jobRoleId = ctx.jobRoleIds.get(row.jobRole);
            if (!jobRoleId) {
                jobRoleId = await upsertJobRole(row.jobRole || 'Consultant');
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
                        allocation_reason: `${SEED_TAG} from Project_Allocation (${latest.hours}h/wk, ${row.resourceType || row.projectType})`,
                        created_by_role: CreatedByRole.ADMIN,
                    },
                },
                { upsert: true, new: true }
            );
            allocationsUpserted++;

            for (const week of row.weeklyHours) {
                await WeeklyAllocationEntry.findOneAndUpdate(
                    {
                        employee_id: employeeId,
                        project_id: projectId,
                        week_start: week.weekStart,
                    },
                    {
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
                    { upsert: true }
                );
                weeklyEntriesUpserted++;
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
                { upsert: true }
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${identifier}: ${msg}`);
            skippedRows.push({ identifier, reason: msg });
        }
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
