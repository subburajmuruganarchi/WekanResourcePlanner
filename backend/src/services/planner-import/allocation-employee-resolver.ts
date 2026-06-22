import { Types } from 'mongoose';
import { Employee } from '../../modules/employees/employee.model';
import { AllocationImportRow } from './types/allocation-row.dto';
import { ImportContext } from './types/import-context.types';
import { ImportWriteOptions, mongooseSessionOpts } from './types/import-write.options';
import {
    allocationImportEmail,
    employeeCodeLookupKeys,
    normalizeEmployeeCode,
    parseName,
    upsertJobRole,
} from './planner-import.utils';
import { structuredLogger } from '../../common/logger';

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type EmployeeRef = {
    _id: Types.ObjectId;
    email: string;
    employee_code?: string | null;
};

function registerEmployeeInContext(ctx: ImportContext, emp: EmployeeRef): void {
    ctx.employeeByEmail.set(String(emp.email).toLowerCase(), emp._id);
    if (emp.employee_code) {
        for (const key of employeeCodeLookupKeys(emp.employee_code)) {
            ctx.employeeByCode.set(key, emp._id);
        }
    }
}

/** Resolve employee from in-memory maps, EID variants, email guess, or name match. */
export async function resolveEmployeeForAllocationRow(
    row: AllocationImportRow,
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId | null> {
    if (row.employeeCode?.trim()) {
        for (const key of employeeCodeLookupKeys(row.employeeCode)) {
            const hit = ctx.employeeByCode.get(key);
            if (hit) return hit;
        }
    }

    if (row.employeeCode?.trim()) {
        const code = normalizeEmployeeCode(row.employeeCode);
        let codeQuery = Employee.findOne({
            $or: [{ employee_code: code }, { employee_code: row.employeeCode.trim().toUpperCase() }],
        }).select('_id email employee_code');
        if (writeOpts?.session) codeQuery = codeQuery.session(writeOpts.session);
        const byCode = await codeQuery.lean();
        if (byCode) {
            registerEmployeeInContext(ctx, byCode as EmployeeRef);
            return byCode._id as Types.ObjectId;
        }
    }

    const firstToken = row.resourceName.split(' ')[0]?.toLowerCase();
    if (firstToken) {
        const emailGuess = [...ctx.employeeByEmail.keys()].find((e) => e.startsWith(firstToken));
        if (emailGuess) {
            return ctx.employeeByEmail.get(emailGuess) ?? null;
        }
    }

    const resourceName = row.resourceName.trim();
    if (resourceName) {
        const { first, last } = parseName(resourceName);
        let nameQuery = Employee.findOne({
            first_name: { $regex: new RegExp(`^${escapeRegex(first)}$`, 'i') },
            last_name: { $regex: new RegExp(`^${escapeRegex(last)}$`, 'i') },
        }).select('_id email employee_code');
        if (writeOpts?.session) nameQuery = nameQuery.session(writeOpts.session);
        const byName = await nameQuery.lean();
        if (byName) {
            registerEmployeeInContext(ctx, byName as EmployeeRef);
            return byName._id as Types.ObjectId;
        }
    }

    return null;
}

/**
 * Create a minimal employee when assigned on Project_Allocation but missing from Resource sync
 * (no row, invalid email, or EID format mismatch).
 */
export async function ensureEmployeeForAllocationRow(
    row: AllocationImportRow,
    ctx: ImportContext,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId | null> {
    const code = row.employeeCode?.trim();
    const resourceName = row.resourceName?.trim();
    if (!code || !resourceName) return null;

    const normalizedCode = normalizeEmployeeCode(code);
    const email = allocationImportEmail(normalizedCode);
    const { first, last } = parseName(resourceName);
    const roleName = row.jobRole?.trim() || 'Consultant';

    let jobRoleId = ctx.jobRoleIds.get(roleName);
    if (!jobRoleId) {
        jobRoleId = await upsertJobRole(roleName, writeOpts);
        ctx.jobRoleIds.set(roleName, jobRoleId);
    }

    const sessionOpts = mongooseSessionOpts(writeOpts);
    const doc = await Employee.findOneAndUpdate(
        {
            $or: [{ employee_code: normalizedCode }, { email }],
        },
        {
            $set: {
                first_name: first,
                last_name: last,
                email,
                employee_code: normalizedCode,
                role_id: ctx.employeeRoleId,
                job_role_id: jobRoleId,
                position: roleName,
                department: row.resourceType?.trim() || 'Engineering',
                status: 'Active',
                is_active: true,
                max_allocation_percent: 100,
            },
            $setOnInsert: { password: ctx.passwordHash },
        },
        { upsert: true, new: true, ...sessionOpts }
    );

    if (!doc) return null;

    structuredLogger.info('ALLOCATION_EMPLOYEE_AUTO_PROVISION', {
        employeeCode: normalizedCode,
        resourceName,
        email,
        syncBatchId: ctx.syncBatchId,
    });

    registerEmployeeInContext(ctx, {
        _id: doc._id as Types.ObjectId,
        email: doc.email,
        employee_code: doc.employee_code,
    });

    return doc._id as Types.ObjectId;
}
