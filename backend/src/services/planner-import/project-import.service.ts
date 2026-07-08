import { Project } from '../../modules/projects/project.model';
import { Types } from 'mongoose';
import { ProjectSkillRequirement } from '../../modules/projects/project-skill-requirement.model';
import { ProjectRoleEffort } from '../../modules/projects/project-role-effort.model';
import { AllocationImportRow } from './types/allocation-row.dto';
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
import { ImportWriteOptions, mongooseSessionOpts, failOrSkipRow, IMPORT_BULK_CHUNK_SIZE } from './types/import-write.options';
import { structuredLogger } from '../../common/logger';

export interface ProjectImportOutput extends SheetImportResult {
    projectsUpserted: number;
}

export async function importProjectRows(
    rows: ProjectImportRow[],
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<ProjectImportOutput> {
    if (writeOpts?.atomic) {
        return importProjectRowsBulk(rows, ctx, writeOpts);
    }
    return importProjectRowsSequential(rows, ctx, writeOpts);
}

/** Upsert job roles and skills outside MongoDB transaction. */
export async function prepareProjectImportReferences(
    rows: ProjectImportRow[],
    ctx: ImportContext
): Promise<void> {
    const refOpts: ImportWriteOptions = { atomic: true };
    for (const row of rows) {
        if (!row.name) continue;

        const staffingRoles: { label: string; count: number }[] = [
            { label: 'SDE II (Full Stack)', count: row.beRequired || row.feRequired },
            { label: 'Mobile Developer', count: row.mobileRequired },
            { label: 'QA Engineer', count: row.qaRequired },
        ];
        for (const staffing of staffingRoles) {
            if (staffing.count <= 0) continue;
            if (!ctx.jobRoleIds.has(staffing.label)) {
                ctx.jobRoleIds.set(staffing.label, await upsertJobRole(staffing.label, refOpts));
            }
        }

        const requirementRoleName =
            row.architect ||
            (row.beRequired > 0 ? 'SDE II (Backend)' : '') ||
            (row.feRequired > 0 ? 'SDE II (Frontend)' : '') ||
            (row.mobileRequired > 0 ? 'SDE II (Mobile)' : '') ||
            (row.qaRequired > 0 ? 'QA Engineer' : '') ||
            'SDE II (Full Stack)';
        if (!ctx.jobRoleIds.has(requirementRoleName)) {
            ctx.jobRoleIds.set(
                requirementRoleName,
                await upsertJobRole(requirementRoleName, refOpts)
            );
        }

        for (const skillName of parseSkillList(row.tech)) {
            if (!ctx.skillCache.has(skillName)) {
                ctx.skillCache.set(
                    skillName,
                    await upsertSkill(skillName, 'Project Tech', refOpts)
                );
            }
        }
    }
}

async function importProjectRowsBulk(
    rows: ProjectImportRow[],
    ctx: ImportContext,
    writeOpts: ImportWriteOptions
): Promise<ProjectImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const sessionOpts = mongooseSessionOpts(writeOpts);
    const startedAt = Date.now();

    structuredLogger.info('PROJECT IMPORT START', {
        rowsReceived: rows.length,
        syncBatchId: ctx.syncBatchId,
    });

    type PreparedProject = {
        row: ProjectImportRow;
        identifier: string;
        code: string;
        status: ProjectStatus;
        start: Date;
        end: Date;
        businessGoal: string;
    };

    const prepared: PreparedProject[] = [];

    for (const row of rows) {
        const identifier = row.pid || row.name || 'unknown';
        if (!row.name) {
            failOrSkipRow(writeOpts, skippedRows, identifier, 'Missing project name');
            continue;
        }

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

        prepared.push({ row, identifier, code, status, start, end, businessGoal });
    }

    const projectOps: Parameters<typeof Project.bulkWrite>[0] = prepared.map((p) => {
        const setFields: Record<string, unknown> = {
            project_name: p.row.name,
            project_code: p.code,
            status: p.status,
            priority: mapPriority(p.row.type, p.status),
            start_date: p.start,
            end_date: p.end,
            billing_type: mapBilling(p.row.type),
            project_type: p.row.type?.trim() || undefined,
            business_goal: p.businessGoal,
            is_active: true,
        };
        if (ctx.syncId) setFields.last_sync_id = ctx.syncId;

        return {
            updateOne: {
                filter: { project_code: p.code },
                update: {
                    $set: setFields,
                    $setOnInsert: {
                        project_owner_id: ctx.defaultAdminId,
                        project_manager_id: ctx.pmFallbackId,
                    },
                },
                upsert: true,
            },
        };
    });

    structuredLogger.info('PROJECT BULK WRITE START', { ops: projectOps.length });
    const writeStart = Date.now();
    for (let i = 0; i < projectOps.length; i += IMPORT_BULK_CHUNK_SIZE) {
        const chunk = projectOps.slice(i, i + IMPORT_BULK_CHUNK_SIZE);
        if (chunk.length > 0) {
            await Project.bulkWrite(chunk, { ordered: true, ...sessionOpts });
        }
    }

    const codes = prepared.map((p) => p.code);
    let projectQuery = Project.find({ project_code: { $in: codes } }).select('_id project_code');
    if (writeOpts.session) {
        projectQuery = projectQuery.session(writeOpts.session);
    }
    const projectDocs = await projectQuery.lean();
    const projectIdByCode = new Map(
        projectDocs.map((p) => [String(p.project_code), p._id as Types.ObjectId])
    );

    const roleEffortOps: Parameters<typeof ProjectRoleEffort.bulkWrite>[0] = [];
    const skillReqOps: Parameters<typeof ProjectSkillRequirement.bulkWrite>[0] = [];

    for (const p of prepared) {
        const projectId = projectIdByCode.get(p.code);
        if (!projectId) {
            throw new Error(`${p.identifier}: project upsert did not persist`);
        }
        ctx.projectByCode.set(p.code, projectId);
        if (p.row.pid) ctx.projectByPid.set(p.row.pid.toUpperCase(), p.code);

        const staffingRoles: { label: string; count: number }[] = [
            { label: 'SDE II (Full Stack)', count: p.row.beRequired || p.row.feRequired },
            { label: 'Mobile Developer', count: p.row.mobileRequired },
            { label: 'QA Engineer', count: p.row.qaRequired },
        ];
        for (const staffing of staffingRoles) {
            if (staffing.count <= 0) continue;
            const roleId = ctx.jobRoleIds.get(staffing.label);
            if (!roleId) {
                throw new Error(`Job role not prepared: ${staffing.label}`);
            }
            roleEffortOps.push({
                updateOne: {
                    filter: { project_id: projectId, role_id: roleId },
                    update: {
                        $set: {
                            project_id: projectId,
                            role_id: roleId,
                            required_headcount: staffing.count,
                            required_days: 60,
                            start_date: p.start,
                            end_date: p.end,
                            hours_per_day: 8,
                        },
                    },
                    upsert: true,
                },
            });
        }

        const techSkills = parseSkillList(p.row.tech);
        const requirementRoleName =
            p.row.architect ||
            (p.row.beRequired > 0 ? 'SDE II (Backend)' : '') ||
            (p.row.feRequired > 0 ? 'SDE II (Frontend)' : '') ||
            (p.row.mobileRequired > 0 ? 'SDE II (Mobile)' : '') ||
            (p.row.qaRequired > 0 ? 'QA Engineer' : '') ||
            'SDE II (Full Stack)';
        const requirementRoleId = ctx.jobRoleIds.get(requirementRoleName);
        if (!requirementRoleId) {
            throw new Error(`Job role not prepared: ${requirementRoleName}`);
        }
        const requirementProfile = roleProfile(requirementRoleName);

        for (const skillName of techSkills) {
            const skillId = ctx.skillCache.get(skillName);
            if (!skillId) continue;
            skillReqOps.push({
                updateOne: {
                    filter: { project_id: projectId, skill_id: skillId },
                    update: {
                        $set: {
                            project_id: projectId,
                            skill_id: skillId,
                            role_id: requirementRoleId,
                            min_skill_level: requirementProfile.level,
                            required_headcount: 1,
                            required_days: 30,
                            start_date: p.start,
                            end_date: p.end,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }

    for (let i = 0; i < roleEffortOps.length; i += IMPORT_BULK_CHUNK_SIZE) {
        const chunk = roleEffortOps.slice(i, i + IMPORT_BULK_CHUNK_SIZE);
        if (chunk.length > 0) {
            await ProjectRoleEffort.bulkWrite(chunk, { ordered: true, ...sessionOpts });
        }
    }
    for (let i = 0; i < skillReqOps.length; i += IMPORT_BULK_CHUNK_SIZE) {
        const chunk = skillReqOps.slice(i, i + IMPORT_BULK_CHUNK_SIZE);
        if (chunk.length > 0) {
            await ProjectSkillRequirement.bulkWrite(chunk, { ordered: true, ...sessionOpts });
        }
    }

    structuredLogger.info('PROJECT BULK WRITE COMPLETE', {
        syncBatchId: ctx.syncBatchId,
        projectsUpserted: prepared.length,
        durationMs: Date.now() - writeStart,
        totalDurationMs: Date.now() - startedAt,
    });

    if (ctx.syncId && !writeOpts?.deferStaleCleanup) {
        await deactivateStaleProjects(ctx.syncId, writeOpts);
    }

    return {
        rowsReceived: rows.length,
        rowsProcessed: prepared.length,
        rowsSkipped: skippedRows.length,
        skippedRows,
        errors: [],
        projectsUpserted: prepared.length,
    };
}

async function importProjectRowsSequential(
    rows: ProjectImportRow[],
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<ProjectImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    let projectsUpserted = 0;
    const sessionOpts = mongooseSessionOpts(writeOpts);

    for (const row of rows) {
        const identifier = row.pid || row.name || 'unknown';

        if (!row.name) {
            failOrSkipRow(writeOpts, skippedRows, identifier, 'Missing project name');
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
                status,
                priority: mapPriority(row.type, status),
                start_date: start,
                end_date: end,
                billing_type: mapBilling(row.type),
                project_type: row.type?.trim() || undefined,
                business_goal: businessGoal,
                is_active: true,
            };
            if (ctx.syncId) setFields.last_sync_id = ctx.syncId;

            const doc = await Project.findOneAndUpdate(
                { project_code: code },
                {
                    $set: setFields,
                    $setOnInsert: {
                        project_owner_id: ctx.defaultAdminId,
                        project_manager_id: ctx.pmFallbackId,
                    },
                },
                { upsert: true, new: true, ...sessionOpts }
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
                    roleId = await upsertJobRole(staffing.label, writeOpts);
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
                    { upsert: true, ...sessionOpts }
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
                requirementRoleId = await upsertJobRole(requirementRoleName, writeOpts);
                ctx.jobRoleIds.set(requirementRoleName, requirementRoleId);
            }
            const requirementProfile = roleProfile(requirementRoleName);

            for (const skillName of techSkills) {
                let skillId = ctx.skillCache.get(skillName);
                if (!skillId) {
                    skillId = await upsertSkill(skillName, 'Project Tech', writeOpts);
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
                    { upsert: true, ...sessionOpts }
                );
            }
        } catch (err) {
            if (writeOpts?.atomic) throw err;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${identifier}: ${msg}`);
            skippedRows.push({ identifier, reason: msg });
        }
    }

    if (ctx.syncId && !writeOpts?.deferStaleCleanup) {
        await deactivateStaleProjects(ctx.syncId, writeOpts);
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

export async function deactivateStaleProjects(
    syncId: string,
    writeOpts?: ImportWriteOptions
): Promise<void> {
    await Project.updateMany(
        { last_sync_id: { $exists: true, $ne: syncId } },
        { $set: { is_active: false, status: ProjectStatus.ON_HOLD } },
        mongooseSessionOpts(writeOpts)
    );
}

const PROJECT_STATUS_RANK: Record<ProjectStatus, number> = {
    [ProjectStatus.ACTIVE]: 5,
    [ProjectStatus.PROPOSAL]: 4,
    [ProjectStatus.PLANNING]: 4,
    [ProjectStatus.ON_HOLD]: 3,
    [ProjectStatus.PROPOSAL_LOST]: 2,
    [ProjectStatus.COMPLETED]: 1,
};

function projectStatusUpdateFields(
    status: ProjectStatus,
    projectType = ''
): {
    status: ProjectStatus;
    is_active: boolean;
    priority: ReturnType<typeof mapPriority>;
    project_type?: string;
} {
    const trimmedType = projectType.trim();
    const fields = {
        status,
        is_active: status === ProjectStatus.ACTIVE || status === ProjectStatus.PLANNING,
        priority: mapPriority(projectType, status),
        ...(trimmedType ? { project_type: trimmedType } : {}),
    };
    return fields;
}

/** Apply column-4 / sheet status after project import commits. */
export async function applyProjectStatusFromProjectRows(rows: ProjectImportRow[]): Promise<number> {
    let updated = 0;

    for (const row of rows) {
        if (!row.name || !row.statusRaw?.trim()) continue;
        const code = projectCodeFromRow(row.pid, row.name);
        const status = mapProjectStatus(row.statusRaw);
        const res = await Project.updateMany(
            { project_code: code },
            { $set: projectStatusUpdateFields(status, row.type) }
        );
        updated += res.modifiedCount;
    }

    if (updated > 0) {
        structuredLogger.info('PROJECT STATUS APPLIED FROM PROJECT SHEET', {
            projectsUpdated: updated,
        });
    }

    return updated;
}

/**
 * Project sheet webhooks can lose Status when the sheet has duplicate "Status" columns.
 * Allocation rows carry a reliable "Project Status" field — use it to repair project.status.
 */
export async function applyProjectStatusFromAllocationRows(
    rows: AllocationImportRow[],
    writeOpts?: ImportWriteOptions
): Promise<number> {
    const statusByPid = new Map<string, ProjectStatus>();

    for (const row of rows) {
        if (!row.pid || !row.projectStatus?.trim()) continue;
        const pid = row.pid.toUpperCase();
        const status = mapProjectStatus(row.projectStatus);
        const existing = statusByPid.get(pid);
        if (!existing || PROJECT_STATUS_RANK[status] > PROJECT_STATUS_RANK[existing]) {
            statusByPid.set(pid, status);
        }
    }

    let updated = 0;
    for (const [pid, status] of statusByPid) {
        const code = projectCodeFromRow(pid, '');
        const res = await Project.updateMany(
            { project_code: code },
            { $set: projectStatusUpdateFields(status, '') },
            mongooseSessionOpts(writeOpts)
        );
        updated += res.modifiedCount;
    }

    if (updated > 0) {
        structuredLogger.info('PROJECT STATUS REPAIRED FROM ALLOCATION', {
            projectsUpdated: updated,
            distinctPids: statusByPid.size,
        });
    }

    return updated;
}

/** Repair project_type from allocation rows (reliable "Project Type" column). */
export async function applyProjectTypeFromAllocationRows(
    rows: AllocationImportRow[],
    writeOpts?: ImportWriteOptions
): Promise<number> {
    const typeByPid = new Map<string, string>();

    for (const row of rows) {
        if (!row.pid || !row.projectType?.trim()) continue;
        typeByPid.set(row.pid.toUpperCase(), row.projectType.trim());
    }

    let updated = 0;
    for (const [pid, projectType] of typeByPid) {
        const code = projectCodeFromRow(pid, '');
        const res = await Project.updateMany(
            { project_code: code },
            { $set: { project_type: projectType } },
            mongooseSessionOpts(writeOpts)
        );
        updated += res.modifiedCount;
    }

    if (updated > 0) {
        structuredLogger.info('PROJECT TYPE REPAIRED FROM ALLOCATION', {
            projectsUpdated: updated,
            distinctPids: typeByPid.size,
        });
    }

    return updated;
}
