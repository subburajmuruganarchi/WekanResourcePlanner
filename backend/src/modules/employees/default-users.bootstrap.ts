import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { Employee } from './employee.model';
import { Role } from '../roles/role.model';
import { structuredLogger } from '../../common/logger';
import { PASSWORD_PLAIN } from '../../services/planner-import/planner-import.utils';
import type { ImportWriteOptions } from '../../services/planner-import/types/import-write.options';
import { mongooseSessionOpts } from '../../services/planner-import/types/import-write.options';

export const PROTECTED_SYSTEM_EMAILS = ['admin@r360.com', 'pm@r360.com'] as const;

const ACCESS_ROLES = {
    ADMIN: 'Admin',
    PM: 'Project Manager',
    EMPLOYEE: 'Employee',
} as const;

const DEFAULT_USERS = [
    {
        email: 'admin@r360.com',
        firstName: 'R360',
        lastName: 'Admin',
        employeeCode: 'WK-ADMIN',
        accessRole: ACCESS_ROLES.ADMIN,
    },
    {
        email: 'pm@r360.com',
        firstName: 'R360',
        lastName: 'PM',
        employeeCode: 'WK-PM',
        accessRole: ACCESS_ROLES.PM,
    },
] as const;

export interface DefaultSystemUsersContext {
    adminRoleId: Types.ObjectId;
    pmRoleId: Types.ObjectId;
    employeeRoleId: Types.ObjectId;
    defaultAdminId: Types.ObjectId;
    pmFallbackId: Types.ObjectId;
    passwordHash: string;
}

async function upsertAccessRole(
    roleName: string,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId> {
    const doc = await Role.findOneAndUpdate(
        { role_name: roleName },
        { $setOnInsert: { role_name: roleName, is_active: true, department: 'WeKan' } },
        { upsert: true, new: true, ...mongooseSessionOpts(writeOpts) }
    );
    return doc!._id;
}

async function upsertDefaultUser(
    params: (typeof DEFAULT_USERS)[number],
    roleId: Types.ObjectId,
    passwordHash: string,
    syncId?: string,
    writeOpts?: ImportWriteOptions
): Promise<Types.ObjectId> {
    const sessionOpts = mongooseSessionOpts(writeOpts);

    let existingQuery = Employee.findOne({ email: params.email }).select('+password');
    if (writeOpts?.session) {
        existingQuery = existingQuery.session(writeOpts.session);
    }
    const existing = await existingQuery.lean();

    const setFields: Record<string, unknown> = {
        first_name: params.firstName,
        last_name: params.lastName,
        role_id: roleId,
        status: 'Active',
        is_active: true,
        employee_code: params.employeeCode,
        department: 'Delivery',
        ...(syncId ? { last_sync_id: syncId } : {}),
    };

    if (!existing?.password) {
        setFields.password = passwordHash;
    }

    const doc = await Employee.findOneAndUpdate(
        { email: params.email },
        { $set: setFields },
        { upsert: true, new: true, ...sessionOpts }
    );

    return doc!._id;
}

/**
 * Ensure admin@r360.com and pm@r360.com exist with default password (Admin123!).
 * Idempotent — safe on every server start and during planner import.
 */
export async function ensureDefaultSystemUsers(
    syncId?: string,
    writeOpts?: ImportWriteOptions
): Promise<DefaultSystemUsersContext> {
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

    const adminRoleId = await upsertAccessRole(ACCESS_ROLES.ADMIN, writeOpts);
    const pmRoleId = await upsertAccessRole(ACCESS_ROLES.PM, writeOpts);
    const employeeRoleId = await upsertAccessRole(ACCESS_ROLES.EMPLOYEE, writeOpts);

    const defaultAdminId = await upsertDefaultUser(
        DEFAULT_USERS[0],
        adminRoleId,
        passwordHash,
        syncId,
        writeOpts
    );
    const pmFallbackId = await upsertDefaultUser(
        DEFAULT_USERS[1],
        pmRoleId,
        passwordHash,
        syncId,
        writeOpts
    );

    structuredLogger.info('DEFAULT SYSTEM USERS ENSURED', {
        emails: PROTECTED_SYSTEM_EMAILS,
        passwordHint: 'Admin123! (only set on insert or when password missing)',
    });

    return {
        adminRoleId,
        pmRoleId,
        employeeRoleId,
        defaultAdminId,
        pmFallbackId,
        passwordHash,
    };
}
