import { Project } from '../../modules/projects/project.model';
import { ProjectSkillRequirement } from '../../modules/projects/project-skill-requirement.model';
import { ProjectRoleEffort } from '../../modules/projects/project-role-effort.model';
import { ProjectImportRow } from './types/project-row.dto';
import { ImportContext } from './types/import-context.types';
import { SheetImportResult, SkippedRow } from './types/import-result.types';
import { ProjectStatus } from '../../common/types/enums';
import {
    SEED_TAG,
    projectCodeFromRow,
    mapProjectStatus,
    mapPriority,
    mapBilling,
    parseSkillList,
    roleProfile,
    upsertJobRole,
    upsertSkill,
} from './planner-import.utils';

export interface ProjectImportOutput extends SheetImportResult {
    projectsUpserted: number;
}

export async function importProjectRows(
    rows: ProjectImportRow[],
    ctx: ImportContext
): Promise<ProjectImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    let projectsUpserted = 0;

    for (const row of rows) {
        const identifier = row.pid || row.name || 'unknown';

        if (!row.name) {
            skippedRows.push({ identifier, reason: 'Missing project name' });
            continue;
        }

        try {
            const code = projectCodeFromRow(row.pid, row.name);
            const status = mapProjectStatus(row.statusRaw);
            const start = row.confirmedStart || row.estimatedStart || new Date('2025-01-01T00:00:00.000Z');
            let end = new Date('2026-12-31T00:00:00.000Z');
            if (row.durationWeeks > 0) {
                end = new Date(start.getTime());
                end.setUTCDate(end.getUTCDate() + row.durationWeeks * 7);
            }

            const staffingNotes = [
                row.architect ? `Architect: ${row.architect}` : '',
                row.beRequired ? `BE: ${row.beRequired}` : '',
                row.feRequired ? `FE: ${row.feRequired}` : '',
                row.mobileRequired ? `Mobile: ${row.mobileRequired}` : '',
                row.qaRequired ? `QA: ${row.qaRequired}` : '',
            ]
                .filter(Boolean)
                .join(' | ');
            const businessGoal =
                [row.tech, staffingNotes].filter(Boolean).join(' — ').slice(0, 500) || SEED_TAG;

            const setFields: Record<string, unknown> = {
                project_name: row.name,
                project_code: code,
                project_owner_id: ctx.defaultAdminId,
                project_manager_id: ctx.pmFallbackId,
                status,
                priority: mapPriority(row.type, status),
                start_date: start,
                end_date: end,
                billing_type: mapBilling(row.type),
                business_goal: businessGoal,
                is_active: true,
            };
            if (ctx.syncId) setFields.last_sync_id = ctx.syncId;

            const doc = await Project.findOneAndUpdate(
                { project_code: code },
                { $set: setFields },
                { upsert: true, new: true }
            );

            projectsUpserted++;
            ctx.projectByCode.set(code, doc!._id);
            if (row.pid) ctx.projectByPid.set(row.pid.toUpperCase(), code);

            const staffingRoles: { label: string; count: number }[] = [
                { label: 'SDE II (Full Stack)', count: row.beRequired || row.feRequired },
                { label: 'Mobile Developer', count: row.mobileRequired },
                { label: 'QA Engineer', count: row.qaRequired },
            ];
            for (const staffing of staffingRoles) {
                if (staffing.count <= 0) continue;
                let roleId = ctx.jobRoleIds.get(staffing.label);
                if (!roleId) {
                    roleId = await upsertJobRole(staffing.label);
                    ctx.jobRoleIds.set(staffing.label, roleId);
                }
                await ProjectRoleEffort.findOneAndUpdate(
                    { project_id: doc!._id, role_id: roleId },
                    {
                        $set: {
                            project_id: doc!._id,
                            role_id: roleId,
                            required_headcount: staffing.count,
                            required_days: 60,
                            start_date: start,
                            end_date: end,
                            hours_per_day: 8,
                        },
                    },
                    { upsert: true }
                );
            }

            const techSkills = parseSkillList(row.tech);
            const requirementRoleName =
                row.architect ||
                (row.beRequired > 0 ? 'SDE II (Backend)' : '') ||
                (row.feRequired > 0 ? 'SDE II (Frontend)' : '') ||
                (row.mobileRequired > 0 ? 'SDE II (Mobile)' : '') ||
                (row.qaRequired > 0 ? 'QA Engineer' : '') ||
                'SDE II (Full Stack)';
            let requirementRoleId = ctx.jobRoleIds.get(requirementRoleName);
            if (!requirementRoleId) {
                requirementRoleId = await upsertJobRole(requirementRoleName);
                ctx.jobRoleIds.set(requirementRoleName, requirementRoleId);
            }
            const requirementProfile = roleProfile(requirementRoleName);

            for (const skillName of techSkills) {
                let skillId = ctx.skillCache.get(skillName);
                if (!skillId) {
                    skillId = await upsertSkill(skillName, 'Project Tech');
                    ctx.skillCache.set(skillName, skillId);
                }
                if (!skillId) continue;
                await ProjectSkillRequirement.findOneAndUpdate(
                    { project_id: doc!._id, skill_id: skillId },
                    {
                        $set: {
                            project_id: doc!._id,
                            skill_id: skillId,
                            role_id: requirementRoleId,
                            min_skill_level: requirementProfile.level,
                            required_headcount: 1,
                            required_days: 30,
                            start_date: start,
                            end_date: end,
                        },
                    },
                    { upsert: true }
                );
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${identifier}: ${msg}`);
            skippedRows.push({ identifier, reason: msg });
        }
    }

    if (ctx.syncId) {
        await deactivateStaleProjects(ctx.syncId);
    }

    return {
        rowsReceived: rows.length,
        rowsProcessed: projectsUpserted,
        rowsSkipped: skippedRows.length,
        skippedRows,
        errors,
        projectsUpserted,
    };
}

async function deactivateStaleProjects(syncId: string): Promise<void> {
    await Project.updateMany(
        { last_sync_id: { $exists: true, $ne: syncId } },
        { $set: { is_active: false, status: ProjectStatus.ON_HOLD } }
    );
}
