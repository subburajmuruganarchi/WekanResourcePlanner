import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { Employee } from '../../modules/employees/employee.model';
import { EmployeeSkill } from '../../modules/employees/employee-skill.model';
import { ResourceImportRow, R360AccessImportRow } from './types/resource-row.dto';
import { ImportContext, ACCESS_ROLES, createEmptyImportContext } from './types/import-context.types';
import { SheetImportResult, SkippedRow } from './types/import-result.types';
import {
    PASSWORD_PLAIN,
    parseName,
    isDummyResource,
    departmentLabel,
    inferSkillLevel,
    inferExperienceYears,
    upsertAccessRole,
    upsertJobRole,
    upsertSkill,
} from './planner-import.utils';
import { ImportWriteOptions, mongooseSessionOpts, failOrSkipRow, IMPORT_BULK_CHUNK_SIZE } from './types/import-write.options';
import { structuredLogger } from '../../common/logger';
import {
    normalizeResourceEmail,
    validateResourceRow,
    ResourceRowValidationIssue,
} from './resource-row.validation';

const PROTECTED_EMAILS = ['admin@r360.com', 'pm@r360.com'];

export interface ResourceImportOutput extends SheetImportResult {
    employeesUpserted: number;
    jobRoles: number;
    skills: number;
}

export async function bootstrapImportContext(
    syncId?: string,
    writeOpts?: ImportWriteOptions
): Promise<ImportContext> {
    const partial = createEmptyImportContext();
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);
    const sessionOpts = mongooseSessionOpts(writeOpts);

    const adminRoleId = await upsertAccessRole(ACCESS_ROLES.ADMIN, writeOpts);
    const pmRoleId = await upsertAccessRole(ACCESS_ROLES.PM, writeOpts);
    const employeeRoleId = await upsertAccessRole(ACCESS_ROLES.EMPLOYEE, writeOpts);

    const defaultAdmin = await Employee.findOneAndUpdate(
        { email: 'admin@r360.com' },
        {
            $set: {
                first_name: 'R360',
                last_name: 'Admin',
                role_id: adminRoleId,
                status: 'Active',
                is_active: true,
                employee_code: 'WK-ADMIN',
                department: 'Delivery',
                ...(syncId ? { last_sync_id: syncId } : {}),
            },
            $setOnInsert: { password: passwordHash },
        },
        { upsert: true, new: true, ...sessionOpts }
    );

    const defaultPm = await Employee.findOneAndUpdate(
        { email: 'pm@r360.com' },
        {
            $set: {
                first_name: 'R360',
                last_name: 'PM',
                role_id: pmRoleId,
                status: 'Active',
                is_active: true,
                employee_code: 'WK-PM',
                department: 'Delivery',
                ...(syncId ? { last_sync_id: syncId } : {}),
            },
            $setOnInsert: { password: passwordHash },
        },
        { upsert: true, new: true, ...sessionOpts }
    );

    return {
        ...partial,
        syncId,
        adminRoleId,
        pmRoleId,
        employeeRoleId,
        defaultAdminId: defaultAdmin!._id,
        pmFallbackId: defaultPm!._id,
        passwordHash,
    };
}

export function applyR360AccessRows(ctx: ImportContext, accessRows: R360AccessImportRow[]): void {
    for (const row of accessRows) {
        if (!row.email.includes('@')) continue;
        let accessId = ctx.employeeRoleId;
        if (row.roles.includes('admin')) accessId = ctx.adminRoleId;
        else if (row.roles.includes('manager')) accessId = ctx.pmRoleId;
        ctx.accessByEmail.set(row.email, accessId);
    }
}

export async function resolvePmFallback(
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<void> {
    for (const [email, roleId] of ctx.accessByEmail) {
        if (roleId.equals(ctx.pmRoleId)) {
            let query = Employee.findOne({ email });
            if (writeOpts?.session) {
                query = query.session(writeOpts.session);
            }
            const pm = await query.lean();
            if (pm) {
                ctx.pmFallbackId = pm._id;
                break;
            }
        }
    }
}

export async function importResourceRows(
    rows: ResourceImportRow[],
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<ResourceImportOutput> {
    if (writeOpts?.atomic) {
        return importResourceRowsBulk(rows, ctx, writeOpts);
    }
    return importResourceRowsSequential(rows, ctx, writeOpts);
}

/** Upsert job roles and skills outside MongoDB transaction (reference data). */
export async function prepareResourceImportReferences(
    rows: ResourceImportRow[],
    ctx: ImportContext
): Promise<void> {
    const refOpts: ImportWriteOptions = { atomic: true };
    for (const row of rows) {
        if (validateResourceRow(row)) continue;
        const email = normalizeResourceEmail(row.email);

        if (!ctx.jobRoleIds.has(row.jobRole)) {
            const jobRoleId = await upsertJobRole(row.jobRole, refOpts);
            ctx.jobRoleIds.set(row.jobRole, jobRoleId);
        }
        for (const sk of [...new Set(row.skills)]) {
            if (!ctx.skillCache.has(sk)) {
                const skillId = await upsertSkill(sk, row.resourceType || 'General', refOpts);
                ctx.skillCache.set(sk, skillId);
            }
        }
    }
}

async function importResourceRowsBulk(
    rows: ResourceImportRow[],
    ctx: ImportContext,
    writeOpts: ImportWriteOptions
): Promise<ResourceImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const sessionOpts = mongooseSessionOpts(writeOpts);
    const bulkStartedAt = Date.now();

    structuredLogger.info('RESOURCE IMPORT START', {
        event: 'START_RESOURCE_IMPORT',
        rowsReceived: rows.length,
        syncBatchId: ctx.syncBatchId,
        syncId: ctx.syncId,
    });

    type PreparedRow = {
        row: ResourceImportRow;
        identifier: string;
        first: string;
        last: string;
        jobRoleId: Types.ObjectId;
        accessRoleId: Types.ObjectId;
        isAvailable: boolean;
    };

    const preparedByEmail = new Map<string, PreparedRow>();

    for (const row of rows) {
        const validationIssue = validateResourceRow(row);
        if (validationIssue) {
            failOrSkipRow(writeOpts, skippedRows, validationIssue.eid, validationIssue.reason);
            continue;
        }

        const email = normalizeResourceEmail(row.email);
        const identifier = email;

        const { first, last } = parseName(row.name);
        const jobRoleId = ctx.jobRoleIds.get(row.jobRole);
        if (!jobRoleId) {
            throw new Error(`Job role not prepared: ${row.jobRole}`);
        }

        preparedByEmail.set(email, {
            row: { ...row, email },
            identifier,
            first,
            last,
            jobRoleId,
            accessRoleId: ctx.accessByEmail.get(email) ?? ctx.employeeRoleId,
            isAvailable: !row.availability.toLowerCase().includes('not'),
        });
    }

    const prepared = [...preparedByEmail.values()];

    const employeeOps: Parameters<typeof Employee.bulkWrite>[0] = prepared.map((p) => {
        const setFields: Record<string, unknown> = {
            first_name: p.first,
            last_name: p.last,
            email: p.row.email.toLowerCase(),
            employee_code: p.row.employeeCode || undefined,
            role_id: p.accessRoleId,
            job_role_id: p.jobRoleId,
            position: p.row.jobRole,
            department: departmentLabel(p.row.resourceType, p.row.location),
            status: p.isAvailable ? 'Active' : 'Inactive',
            is_active: p.isAvailable,
            max_allocation_percent: 100,
        };
        if (ctx.syncId) setFields.last_sync_id = ctx.syncId;

        return {
            updateOne: {
                filter: { email: p.row.email.toLowerCase() },
                update: {
                    $set: setFields,
                    $setOnInsert: { password: ctx.passwordHash },
                },
                upsert: true,
            },
        };
    });

    structuredLogger.info('RESOURCE BULK WRITE START', {
        event: 'RESOURCE_BULK_WRITE_START',
        syncBatchId: ctx.syncBatchId,
        syncId: ctx.syncId,
        employeeOps: employeeOps.length,
    });

    const employeeWriteStart = Date.now();
    let employeeWriteCount = 0;
    for (let i = 0; i < employeeOps.length; i += IMPORT_BULK_CHUNK_SIZE) {
        const chunk = employeeOps.slice(i, i + IMPORT_BULK_CHUNK_SIZE);
        if (chunk.length > 0) {
            const result = await Employee.bulkWrite(chunk, { ordered: true, ...sessionOpts });
            employeeWriteCount += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
        }
    }

    if (employeeWriteCount !== prepared.length) {
        throw new Error(
            `Resource employee bulkWrite mismatch: expected ${prepared.length} writes, got ${employeeWriteCount}`
        );
    }

    const emails = prepared.map((p) => p.row.email.toLowerCase());
    let employeeQuery = Employee.find({ email: { $in: emails } }).select('_id email employee_code');
    if (writeOpts.session) {
        employeeQuery = employeeQuery.session(writeOpts.session);
    }
    const employeeDocs = await employeeQuery.lean();

    const employeeIdByEmail = new Map(
        employeeDocs.map((e) => [String(e.email).toLowerCase(), e._id as Types.ObjectId])
    );

    for (const p of prepared) {
        const id = employeeIdByEmail.get(p.row.email.toLowerCase());
        if (!id) {
            throw new Error(`${p.identifier}: employee upsert did not persist`);
        }
        ctx.employeeByEmail.set(p.row.email.toLowerCase(), id);
        if (p.row.employeeCode) {
            ctx.employeeByCode.set(p.row.employeeCode.toUpperCase(), id);
        }
    }

    const skillOps: Parameters<typeof EmployeeSkill.bulkWrite>[0] = [];
    for (const p of prepared) {
        const employeeId = employeeIdByEmail.get(p.row.email.toLowerCase())!;
        for (let i = 0; i < p.row.skills.length; i++) {
            const sk = p.row.skills[i];
            const skillId = ctx.skillCache.get(sk);
            if (!skillId) continue;
            if (i === 0) ctx.employeePrimarySkill.set(employeeId.toString(), skillId);
            skillOps.push({
                updateOne: {
                    filter: { employee_id: employeeId, skill_id: skillId },
                    update: {
                        $set: {
                            employee_id: employeeId,
                            skill_id: skillId,
                            skill_level: inferSkillLevel(p.row.jobRole, i),
                            experience_years: inferExperienceYears(p.row.jobRole, i),
                            is_primary: i === 0,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }

    for (let i = 0; i < skillOps.length; i += IMPORT_BULK_CHUNK_SIZE) {
        const chunk = skillOps.slice(i, i + IMPORT_BULK_CHUNK_SIZE);
        if (chunk.length > 0) {
            await EmployeeSkill.bulkWrite(chunk, { ordered: true, ...sessionOpts });
        }
    }

    structuredLogger.info('RESOURCE BULK WRITE COMPLETE', {
        event: 'RESOURCE_BULK_WRITE_COMPLETE',
        syncBatchId: ctx.syncBatchId,
        syncId: ctx.syncId,
        employeesUpserted: prepared.length,
        skillOps: skillOps.length,
        durationMs: Date.now() - employeeWriteStart,
        totalDurationMs: Date.now() - bulkStartedAt,
    });

    if (ctx.syncId && !writeOpts?.deferStaleCleanup) {
        await deactivateStaleEmployees(ctx.syncId, writeOpts);
    }

    return {
        rowsReceived: rows.length,
        rowsProcessed: prepared.length,
        rowsSkipped: skippedRows.length,
        skippedRows,
        errors: [],
        employeesUpserted: prepared.length,
        jobRoles: ctx.jobRoleIds.size,
        skills: ctx.skillCache.size,
    };
}

async function importResourceRowsSequential(
    rows: ResourceImportRow[],
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<ResourceImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    let employeesUpserted = 0;
    const sessionOpts = mongooseSessionOpts(writeOpts);

    for (const row of rows) {
        const validationIssue = validateResourceRow(row);
        if (validationIssue) {
            failOrSkipRow(writeOpts, skippedRows, validationIssue.eid, validationIssue.reason);
            continue;
        }

        const email = normalizeResourceEmail(row.email);
        const identifier = email;

        try {
            const { first, last } = parseName(row.name);
            let jobRoleId = ctx.jobRoleIds.get(row.jobRole);
            if (!jobRoleId) {
                jobRoleId = await upsertJobRole(row.jobRole, writeOpts);
                ctx.jobRoleIds.set(row.jobRole, jobRoleId);
            }

            const accessRoleId = ctx.accessByEmail.get(email) ?? ctx.employeeRoleId;
            const isAvailable = !row.availability.toLowerCase().includes('not');

            const setFields: Record<string, unknown> = {
                first_name: first,
                last_name: last,
                email: email,
                employee_code: row.employeeCode || undefined,
                role_id: accessRoleId,
                job_role_id: jobRoleId,
                position: row.jobRole,
                department: departmentLabel(row.resourceType, row.location),
                status: isAvailable ? 'Active' : 'Inactive',
                is_active: isAvailable,
                max_allocation_percent: 100,
            };
            if (ctx.syncId) setFields.last_sync_id = ctx.syncId;

            const emp = await Employee.findOneAndUpdate(
                { email: row.email },
                {
                    $set: setFields,
                    $setOnInsert: { password: ctx.passwordHash },
                },
                { upsert: true, new: true, ...sessionOpts }
            );

            employeesUpserted++;
            ctx.employeeByEmail.set(email, emp!._id);
            if (row.employeeCode) ctx.employeeByCode.set(row.employeeCode.toUpperCase(), emp!._id);

            const skillIdsForEmployee: Types.ObjectId[] = [];
            for (let i = 0; i < row.skills.length; i++) {
                const sk = row.skills[i];
                let skillId = ctx.skillCache.get(sk);
                if (!skillId) {
                    skillId = await upsertSkill(sk, row.resourceType || 'General', writeOpts);
                    ctx.skillCache.set(sk, skillId);
                }
                if (!skillId) continue;
                skillIdsForEmployee.push(skillId);
                await EmployeeSkill.findOneAndUpdate(
                    { employee_id: emp!._id, skill_id: skillId },
                    {
                        $set: {
                            employee_id: emp!._id,
                            skill_id: skillId,
                            skill_level: inferSkillLevel(row.jobRole, i),
                            experience_years: inferExperienceYears(row.jobRole, i),
                            is_primary: i === 0,
                        },
                    },
                    { upsert: true, ...sessionOpts }
                );
            }

            if (skillIdsForEmployee.length > 0) {
                ctx.employeePrimarySkill.set(emp!._id.toString(), skillIdsForEmployee[0]);
                await EmployeeSkill.deleteMany(
                    {
                        employee_id: emp!._id,
                        skill_id: { $nin: skillIdsForEmployee },
                    },
                    sessionOpts
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
        await deactivateStaleEmployees(ctx.syncId, writeOpts);
    }

    return {
        rowsReceived: rows.length,
        rowsProcessed: employeesUpserted,
        rowsSkipped: skippedRows.length,
        skippedRows,
        errors,
        employeesUpserted,
        jobRoles: ctx.jobRoleIds.size,
        skills: ctx.skillCache.size,
    };
}

export async function deactivateStaleEmployees(
    syncId: string,
    writeOpts?: ImportWriteOptions
): Promise<void> {
    await Employee.updateMany(
        {
            last_sync_id: { $exists: true, $ne: syncId },
            email: { $nin: PROTECTED_EMAILS },
        },
        { $set: { is_active: false, status: 'Inactive' } },
        mongooseSessionOpts(writeOpts)
    );
}
