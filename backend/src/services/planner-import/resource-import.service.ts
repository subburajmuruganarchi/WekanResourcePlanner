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

const PROTECTED_EMAILS = ['admin@r360.com', 'pm@r360.com'];

export interface ResourceImportOutput extends SheetImportResult {
    employeesUpserted: number;
    jobRoles: number;
    skills: number;
}

export async function bootstrapImportContext(syncId?: string): Promise<ImportContext> {
    const partial = createEmptyImportContext();
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

    const adminRoleId = await upsertAccessRole(ACCESS_ROLES.ADMIN);
    const pmRoleId = await upsertAccessRole(ACCESS_ROLES.PM);
    const employeeRoleId = await upsertAccessRole(ACCESS_ROLES.EMPLOYEE);

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
        { upsert: true, new: true }
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
        { upsert: true, new: true }
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

export async function resolvePmFallback(ctx: ImportContext): Promise<void> {
    for (const [email, roleId] of ctx.accessByEmail) {
        if (roleId.equals(ctx.pmRoleId)) {
            const pm = await Employee.findOne({ email }).lean();
            if (pm) {
                ctx.pmFallbackId = pm._id;
                break;
            }
        }
    }
}

export async function importResourceRows(
    rows: ResourceImportRow[],
    ctx: ImportContext
): Promise<ResourceImportOutput> {
    const skippedRows: SkippedRow[] = [];
    const errors: string[] = [];
    let employeesUpserted = 0;

    for (const row of rows) {
        const identifier = row.email || row.employeeCode || row.name || 'unknown';

        if (!row.email.includes('@')) {
            skippedRows.push({ identifier, reason: 'Invalid email' });
            continue;
        }
        if (isDummyResource(row.name, row.employeeCode)) {
            skippedRows.push({ identifier, reason: 'Dummy resource row' });
            continue;
        }

        try {
            const { first, last } = parseName(row.name);
            let jobRoleId = ctx.jobRoleIds.get(row.jobRole);
            if (!jobRoleId) {
                jobRoleId = await upsertJobRole(row.jobRole);
                ctx.jobRoleIds.set(row.jobRole, jobRoleId);
            }

            const accessRoleId = ctx.accessByEmail.get(row.email) ?? ctx.employeeRoleId;
            const isAvailable = !row.availability.toLowerCase().includes('not');

            const setFields: Record<string, unknown> = {
                first_name: first,
                last_name: last,
                email: row.email,
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
                { upsert: true, new: true }
            );

            employeesUpserted++;
            ctx.employeeByEmail.set(row.email, emp!._id);
            if (row.employeeCode) ctx.employeeByCode.set(row.employeeCode.toUpperCase(), emp!._id);

            const skillIdsForEmployee: Types.ObjectId[] = [];
            for (let i = 0; i < row.skills.length; i++) {
                const sk = row.skills[i];
                let skillId = ctx.skillCache.get(sk);
                if (!skillId) {
                    skillId = await upsertSkill(sk, row.resourceType || 'General');
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
                    { upsert: true }
                );
            }

            if (skillIdsForEmployee.length > 0) {
                ctx.employeePrimarySkill.set(emp!._id.toString(), skillIdsForEmployee[0]);
                await EmployeeSkill.deleteMany({
                    employee_id: emp!._id,
                    skill_id: { $nin: skillIdsForEmployee },
                });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${identifier}: ${msg}`);
            skippedRows.push({ identifier, reason: msg });
        }
    }

    if (ctx.syncId) {
        await deactivateStaleEmployees(ctx.syncId);
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

async function deactivateStaleEmployees(syncId: string): Promise<void> {
    await Employee.updateMany(
        {
            last_sync_id: { $exists: true, $ne: syncId },
            email: { $nin: PROTECTED_EMAILS },
        },
        { $set: { is_active: false, status: 'Inactive' } }
    );
}
