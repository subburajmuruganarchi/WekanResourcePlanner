import { Types } from 'mongoose';

export const ACCESS_ROLES = {
    ADMIN: 'Admin',
    PM: 'Project Manager',
    EMPLOYEE: 'Employee',
} as const;

export interface ImportContext {
    syncId?: string;
    jobRoleIds: Map<string, Types.ObjectId>;
    employeeByEmail: Map<string, Types.ObjectId>;
    employeeByCode: Map<string, Types.ObjectId>;
    employeePrimarySkill: Map<string, Types.ObjectId>;
    skillCache: Map<string, Types.ObjectId | undefined>;
    projectByCode: Map<string, Types.ObjectId>;
    projectByPid: Map<string, string>;
    accessByEmail: Map<string, Types.ObjectId>;
    adminRoleId: Types.ObjectId;
    pmRoleId: Types.ObjectId;
    employeeRoleId: Types.ObjectId;
    defaultAdminId: Types.ObjectId;
    pmFallbackId: Types.ObjectId;
    passwordHash: string;
}

export function createEmptyImportContext(): Omit<
    ImportContext,
    | 'adminRoleId'
    | 'pmRoleId'
    | 'employeeRoleId'
    | 'defaultAdminId'
    | 'pmFallbackId'
    | 'passwordHash'
> {
    return {
        jobRoleIds: new Map(),
        employeeByEmail: new Map(),
        employeeByCode: new Map(),
        employeePrimarySkill: new Map(),
        skillCache: new Map(),
        projectByCode: new Map(),
        projectByPid: new Map(),
        accessByEmail: new Map(),
    };
}
