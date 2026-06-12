/**
 * R360 local/UAT bootstrap — idempotent dev seed for empty or existing databases.
 *
 * Reuses patterns from: scripts/uat-load.ts, scripts/migrate-passwords.ts
 * Does NOT replace: migrate:roles, migrate-pm-ids (run after import if legacy data exists)
 *
 * Usage: npm run seed:dev
 */

import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Role } from '../src/modules/roles/role.model';
import { Employee } from '../src/modules/employees/employee.model';
import { EmployeeSkill } from '../src/modules/employees/employee-skill.model';
import { Skill } from '../src/modules/skills/skill.model';
import { Project } from '../src/modules/projects/project.model';
import { ProjectSkillRequirement } from '../src/modules/projects/project-skill-requirement.model';
import { ProjectRoleEffort } from '../src/modules/projects/project-role-effort.model';
import { ProjectAllocation } from '../src/modules/allocations/allocation.model';
import { TimeCode } from '../src/modules/time-entries/time-code.model';
import { TimeEntry } from '../src/modules/time-entries/time-entry.model';
import { Notification, NotificationType } from '../src/modules/notifications/notification.model';
import {
    ProjectStatus,
    ProjectPriority,
    TimeEntryStatus,
    SkillLevel,
    CreatedByRole,
} from '../src/common/types/enums';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SEED_TAG = 'dev-seed-v1';
const PASSWORD_PLAIN = 'Admin123!';

/** Canonical RBAC role names (must match auth + role.middleware). */
const ACCESS_ROLES = {
    ADMIN: 'Admin',
    PM: 'Project Manager',
    EMPLOYEE: 'Employee',
} as const;

const JOB_ROLE_DEVELOPER = 'Developer';

const USERS = {
    admin: { email: 'admin@r360.com', first: 'R360', last: 'Admin', access: ACCESS_ROLES.ADMIN },
    pm: { email: 'pm@r360.com', first: 'R360', last: 'ProjectManager', access: ACCESS_ROLES.PM },
    employee: { email: 'employee@r360.com', first: 'R360', last: 'Employee', access: ACCESS_ROLES.EMPLOYEE },
} as const;

const TIME_CODES = [
    { code: 'DEV', description: 'Development work', isBillable: true },
    { code: 'MEETING', description: 'Meetings', isBillable: false },
    { code: 'TESTING', description: 'QA and testing', isBillable: true },
    { code: 'SUPPORT', description: 'Support activities', isBillable: true },
] as const;

const PROJECTS = [
    { code: 'R360-ALPHA', name: 'R360 Platform Alpha' },
    { code: 'R360-BETA', name: 'R360 Platform Beta' },
] as const;

interface SeedSummary {
    roles: Record<string, string>;
    skills: Record<string, string>;
    timeCodes: Record<string, string>;
    employees: Record<string, string>;
    projects: Record<string, string>;
    allocations: string[];
    timeEntries: Record<string, string>;
    notifications: number;
}

function resolveMongoUri(): string {
    const uri = process.env.MONGO_URI?.trim() || process.env.DATABASE_URL?.trim();
    if (!uri) {
        throw new Error('MONGO_URI or DATABASE_URL is required in backend/.env');
    }
    return uri;
}

/** UTC Monday 00:00:00.000, optionally offset by whole weeks. */
function utcWeekStart(offsetWeeks = 0): Date {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    monday.setUTCDate(diff + offsetWeeks * 7);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

function addUtcDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

async function upsertAccessRole(roleName: string): Promise<Types.ObjectId> {
    const doc = await Role.findOneAndUpdate(
        { role_name: roleName },
        { $setOnInsert: { role_name: roleName, is_active: true, department: 'R360' } },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertJobRole(roleName: string): Promise<Types.ObjectId> {
    const doc = await Role.findOneAndUpdate(
        { role_name: roleName },
        {
            $setOnInsert: {
                role_name: roleName,
                is_active: true,
                department: 'Engineering',
                default_rate: 100,
            },
        },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertSkill(name: string, category: string): Promise<Types.ObjectId> {
    const doc = await Skill.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, category, is_active: true, description: `${SEED_TAG} skill` } },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertTimeCode(
    code: string,
    description: string,
    isBillable: boolean
): Promise<Types.ObjectId> {
    const doc = await TimeCode.findOneAndUpdate(
        { code },
        { $set: { description, isBillable } },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertEmployee(params: {
    email: string;
    first_name: string;
    last_name: string;
    role_id: Types.ObjectId;
    job_role_id?: Types.ObjectId;
    employee_code: string;
    passwordHash: string;
}): Promise<Types.ObjectId> {
    const doc = await Employee.findOneAndUpdate(
        { email: params.email.toLowerCase() },
        {
            $set: {
                first_name: params.first_name,
                last_name: params.last_name,
                role_id: params.role_id,
                job_role_id: params.job_role_id,
                employee_code: params.employee_code,
                password: params.passwordHash,
                status: 'Active',
                is_active: true,
                department: 'Engineering',
                position: params.email.split('@')[0],
            },
        },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertProjectRoleEffort(
    projectId: Types.ObjectId,
    roleId: Types.ObjectId,
    headcount: number
): Promise<void> {
    const project = await Project.findById(projectId).lean();
    if (!project) return;
    await ProjectRoleEffort.findOneAndUpdate(
        { project_id: projectId, role_id: roleId },
        {
            $set: {
                project_id: projectId,
                role_id: roleId,
                required_headcount: headcount,
                required_days: 60,
                start_date: project.start_date,
                end_date: project.end_date,
                hours_per_day: 8,
            },
        },
        { upsert: true }
    );
}

async function upsertEmployeeSkill(
    employeeId: Types.ObjectId,
    skillId: Types.ObjectId,
    primary: boolean
): Promise<void> {
    await EmployeeSkill.findOneAndUpdate(
        { employee_id: employeeId, skill_id: skillId },
        {
            $setOnInsert: {
                employee_id: employeeId,
                skill_id: skillId,
                skill_level: SkillLevel.INTERMEDIATE,
                experience_years: 3,
                is_primary: primary,
            },
        },
        { upsert: true }
    );
}

async function upsertProject(params: {
    project_code: string;
    project_name: string;
    project_owner_id: Types.ObjectId;
    project_manager_id: Types.ObjectId;
}): Promise<Types.ObjectId> {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end = new Date('2026-12-31T00:00:00.000Z');
    const doc = await Project.findOneAndUpdate(
        { project_code: params.project_code },
        {
            $set: {
                project_name: params.project_name,
                project_owner_id: params.project_owner_id,
                project_manager_id: params.project_manager_id,
                status: ProjectStatus.ACTIVE,
                priority: ProjectPriority.HIGH,
                start_date: start,
                end_date: end,
                business_goal: `${SEED_TAG} demo project`,
            },
        },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertProjectSkillRequirement(
    projectId: Types.ObjectId,
    skillId: Types.ObjectId,
    jobRoleId: Types.ObjectId
): Promise<void> {
    const project = await Project.findById(projectId).lean();
    if (!project) return;
    await ProjectSkillRequirement.findOneAndUpdate(
        { project_id: projectId, skill_id: skillId },
        {
            $setOnInsert: {
                project_id: projectId,
                skill_id: skillId,
                role_id: jobRoleId,
                min_skill_level: SkillLevel.INTERMEDIATE,
                required_headcount: 2,
                required_days: 30,
                start_date: project.start_date,
                end_date: project.end_date,
            },
        },
        { upsert: true }
    );
}

async function upsertAllocation(params: {
    project_id: Types.ObjectId;
    employee_id: Types.ObjectId;
    role_id: Types.ObjectId;
    skill_id: Types.ObjectId;
    percent: number;
}): Promise<Types.ObjectId> {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end = new Date('2026-12-31T00:00:00.000Z');
    const doc = await ProjectAllocation.findOneAndUpdate(
        { project_id: params.project_id, employee_id: params.employee_id },
        {
            $set: {
                role_id: params.role_id,
                skill_id: params.skill_id,
                start_date: start,
                end_date: end,
                allocation_percent: params.percent,
                is_active: true,
                allocation_reason: SEED_TAG,
                created_by_role: CreatedByRole.ADMIN,
            },
        },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertTimeEntry(params: {
    seedKey: string;
    employeeId: Types.ObjectId;
    projectId: Types.ObjectId;
    timeCodeId: Types.ObjectId;
    weekStartDate: Date;
    date: Date;
    hours: number;
    status: TimeEntryStatus;
    projectManagerUserId: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    rejectedBy?: Types.ObjectId;
    rejectionComment?: string;
}): Promise<Types.ObjectId> {
    const comments = `${SEED_TAG}:${params.seedKey}`;
    const update: Record<string, unknown> = {
        employeeId: params.employeeId,
        projectId: params.projectId,
        timeCodeId: params.timeCodeId,
        weekStartDate: params.weekStartDate,
        date: params.date,
        hours: params.hours,
        status: params.status,
        projectManagerUserId: params.projectManagerUserId,
        comments,
    };
    if (params.status === TimeEntryStatus.PM_APPROVED) {
        update.approvedBy = params.approvedBy ?? params.projectManagerUserId;
        update.approvedAt = new Date();
        update.rejectedBy = undefined;
        update.rejectedAt = undefined;
        update.rejectionComment = undefined;
    }
    if (params.status === TimeEntryStatus.PM_REJECTED) {
        update.rejectedBy = params.rejectedBy ?? params.projectManagerUserId;
        update.rejectedAt = new Date();
        update.rejectionComment = params.rejectionComment ?? 'Rejected during dev seed for UAT';
        update.approvedBy = undefined;
        update.approvedAt = undefined;
    }

    const doc = await TimeEntry.findOneAndUpdate(
        { comments },
        { $set: update },
        { upsert: true, new: true }
    );
    return doc!._id;
}

async function upsertNotification(params: {
    seedKey: string;
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
}): Promise<void> {
    await Notification.findOneAndUpdate(
        { message: `${SEED_TAG}:${params.seedKey}` },
        {
            $set: {
                userId: params.userId,
                title: params.title,
                message: `${SEED_TAG}:${params.seedKey}`,
                type: params.type,
                read: params.read,
                relatedData: { seed: SEED_TAG, key: params.seedKey },
            },
        },
        { upsert: true }
    );
}

async function seed(): Promise<SeedSummary> {
    const summary: SeedSummary = {
        roles: {},
        skills: {},
        timeCodes: {},
        employees: {},
        projects: {},
        allocations: [],
        timeEntries: {},
        notifications: 0,
    };

    console.log(`\n=== R360 Dev Seed (${SEED_TAG}) ===\n`);
    console.log('Connecting to MongoDB...');
    await mongoose.connect(resolveMongoUri());
    console.log('Connected.\n');

    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);
    console.log('Password hashing: bcrypt.genSalt(10) + bcrypt.hash (same as auth.service login compare)\n');

    // --- Roles ---
    console.log('--- Access roles (RBAC) ---');
    for (const name of Object.values(ACCESS_ROLES)) {
        summary.roles[name] = (await upsertAccessRole(name)).toString();
        console.log(`  ${name} -> ${summary.roles[name]}`);
    }
    summary.roles[JOB_ROLE_DEVELOPER] = (await upsertJobRole(JOB_ROLE_DEVELOPER)).toString();
    console.log(`  ${JOB_ROLE_DEVELOPER} (allocation job role) -> ${summary.roles[JOB_ROLE_DEVELOPER]}`);

    // --- Skills ---
    console.log('\n--- Skills ---');
    summary.skills.React = (await upsertSkill('React', 'Frontend')).toString();
    summary.skills.TypeScript = (await upsertSkill('TypeScript', 'Frontend')).toString();
    console.log(`  React -> ${summary.skills.React}`);
    console.log(`  TypeScript -> ${summary.skills.TypeScript}`);

    // --- Time codes ---
    console.log('\n--- Time codes ---');
    for (const tc of TIME_CODES) {
        summary.timeCodes[tc.code] = (
            await upsertTimeCode(tc.code, tc.description, tc.isBillable)
        ).toString();
        console.log(`  ${tc.code} -> ${summary.timeCodes[tc.code]}`);
    }

    const devRoleId = new Types.ObjectId(summary.roles[JOB_ROLE_DEVELOPER]);
    const reactSkillId = new Types.ObjectId(summary.skills.React);

    // --- Employees ---
    console.log('\n--- Employees (login users) ---');
    const adminRoleId = new Types.ObjectId(summary.roles[ACCESS_ROLES.ADMIN]);
    const pmRoleId = new Types.ObjectId(summary.roles[ACCESS_ROLES.PM]);
    const empRoleId = new Types.ObjectId(summary.roles[ACCESS_ROLES.EMPLOYEE]);

    summary.employees.admin = (
        await upsertEmployee({
            email: USERS.admin.email,
            first_name: USERS.admin.first,
            last_name: USERS.admin.last,
            role_id: adminRoleId,
            employee_code: 'R360-ADM',
            passwordHash,
        })
    ).toString();
    summary.employees.pm = (
        await upsertEmployee({
            email: USERS.pm.email,
            first_name: USERS.pm.first,
            last_name: USERS.pm.last,
            role_id: pmRoleId,
            employee_code: 'R360-PM',
            passwordHash,
        })
    ).toString();
    summary.employees.employee = (
        await upsertEmployee({
            email: USERS.employee.email,
            first_name: USERS.employee.first,
            last_name: USERS.employee.last,
            role_id: empRoleId,
            job_role_id: devRoleId,
            employee_code: 'R360-EMP',
            passwordHash,
        })
    ).toString();

    for (const key of Object.keys(USERS) as Array<keyof typeof USERS>) {
        console.log(`  ${key}: ${USERS[key].email} -> ${summary.employees[key]}`);
    }

    const adminId = new Types.ObjectId(summary.employees.admin);
    const pmId = new Types.ObjectId(summary.employees.pm);
    const employeeId = new Types.ObjectId(summary.employees.employee);

    await upsertEmployeeSkill(employeeId, reactSkillId, true);
    await upsertEmployeeSkill(employeeId, new Types.ObjectId(summary.skills.TypeScript), false);
    console.log('\n  Employee skills linked for allocation ranking.');

    // --- Projects ---
    console.log('\n--- Projects ---');
    for (const p of PROJECTS) {
        summary.projects[p.code] = (
            await upsertProject({
                project_code: p.code,
                project_name: p.name,
                project_owner_id: adminId,
                project_manager_id: pmId,
            })
        ).toString();
        console.log(`  ${p.code} -> ${summary.projects[p.code]} (PM: pm@r360.com)`);
        const projectId = new Types.ObjectId(summary.projects[p.code]);
        await upsertProjectSkillRequirement(projectId, reactSkillId, devRoleId);
        await upsertProjectRoleEffort(projectId, devRoleId, 2);
        console.log(`  ${p.code}: skill req + role effort (Developer ×2)`);
    }

    const alphaProjectId = new Types.ObjectId(summary.projects['R360-ALPHA']);
    const betaProjectId = new Types.ObjectId(summary.projects['R360-BETA']);
    const devTimeCodeId = new Types.ObjectId(summary.timeCodes.DEV);

    // --- Allocations ---
    console.log('\n--- Allocations ---');
    summary.allocations.push(
        (
            await upsertAllocation({
                project_id: alphaProjectId,
                employee_id: employeeId,
                role_id: devRoleId,
                skill_id: reactSkillId,
                percent: 60,
            })
        ).toString()
    );
    summary.allocations.push(
        (
            await upsertAllocation({
                project_id: betaProjectId,
                employee_id: employeeId,
                role_id: devRoleId,
                skill_id: reactSkillId,
                percent: 20,
            })
        ).toString()
    );
    console.log(`  employee@r360.com -> R360-ALPHA (60%), R360-BETA (20%)`);

    // --- Time entries (current week + history) ---
    console.log('\n--- Time entries ---');
    const week0 = utcWeekStart(0);
    const weekMinus1 = utcWeekStart(-1);
    const weekMinus2 = utcWeekStart(-2);

    summary.timeEntries.draftCurrentWeek = (
        await upsertTimeEntry({
            seedKey: 'draft-w0-mon',
            employeeId,
            projectId: alphaProjectId,
            timeCodeId: devTimeCodeId,
            weekStartDate: week0,
            date: addUtcDays(week0, 0),
            hours: 8,
            status: TimeEntryStatus.DRAFT,
            projectManagerUserId: pmId,
        })
    ).toString();

    summary.timeEntries.submittedPriorWeek = (
        await upsertTimeEntry({
            seedKey: 'submitted-w-1-tue',
            employeeId,
            projectId: alphaProjectId,
            timeCodeId: devTimeCodeId,
            weekStartDate: weekMinus1,
            date: addUtcDays(weekMinus1, 1),
            hours: 7,
            status: TimeEntryStatus.SUBMITTED,
            projectManagerUserId: pmId,
        })
    ).toString();

    summary.timeEntries.submittedPriorWeek2 = (
        await upsertTimeEntry({
            seedKey: 'submitted-w-1-wed',
            employeeId,
            projectId: alphaProjectId,
            timeCodeId: devTimeCodeId,
            weekStartDate: weekMinus1,
            date: addUtcDays(weekMinus1, 2),
            hours: 8,
            status: TimeEntryStatus.SUBMITTED,
            projectManagerUserId: pmId,
        })
    ).toString();

    summary.timeEntries.approvedHistory = (
        await upsertTimeEntry({
            seedKey: 'approved-w-2-thu',
            employeeId,
            projectId: betaProjectId,
            timeCodeId: devTimeCodeId,
            weekStartDate: weekMinus2,
            date: addUtcDays(weekMinus2, 3),
            hours: 6,
            status: TimeEntryStatus.PM_APPROVED,
            projectManagerUserId: pmId,
            approvedBy: pmId,
        })
    ).toString();

    summary.timeEntries.rejectedHistory = (
        await upsertTimeEntry({
            seedKey: 'rejected-w-2-fri',
            employeeId,
            projectId: alphaProjectId,
            timeCodeId: devTimeCodeId,
            weekStartDate: weekMinus2,
            date: addUtcDays(weekMinus2, 4),
            hours: 4,
            status: TimeEntryStatus.PM_REJECTED,
            projectManagerUserId: pmId,
            rejectedBy: pmId,
            rejectionComment: 'Insufficient detail in comments — resubmit.',
        })
    ).toString();

    for (const [k, id] of Object.entries(summary.timeEntries)) {
        console.log(`  ${k}: ${id}`);
    }

    // --- Notifications ---
    console.log('\n--- Notifications ---');
    const notifSpecs = [
        { key: 'admin-welcome', userId: adminId, title: 'Welcome Admin', read: false },
        { key: 'pm-pending', userId: pmId, title: 'Timesheets pending approval', read: false },
        { key: 'emp-draft', userId: employeeId, title: 'Draft timesheet reminder', read: true },
    ];
    for (const n of notifSpecs) {
        await upsertNotification({
            seedKey: n.key,
            userId: n.userId,
            title: n.title,
            message: n.title,
            type: NotificationType.INFO,
            read: n.read,
        });
        summary.notifications += 1;
    }
    console.log(`  Upserted ${summary.notifications} notifications.`);

    return summary;
}

function printDependencyGraph(): void {
    console.log('\n--- Dependency graph ---');
    console.log(`
Role (Admin | Project Manager | Employee)
  └── Employee (admin@ | pm@ | employee@) + bcrypt password
        ├── EmployeeSkill → Skill (React)
        ├── ProjectAllocation → Project ← project_manager_id (PM employee)
        │                         └── ProjectSkillRequirement → Skill
        └── TimeEntry → Project + TimeCode + projectManagerUserId (PM)
              statuses: Draft (current week) | Submitted (PM queue) | PM_Approved | PM_Rejected
Notification → userId (Employee _id)
`);
}

function printExecutionOrder(): void {
    console.log('\n--- Execution order ---');
    console.log(`
1. Configure backend/.env (MONGO_URI; FRONTEND_URL for server — not required for seed)
2. npm run seed:dev          ← this script (idempotent)
3. npm run verify:seed       ← validate counts and login users
4. Optional if importing legacy DB: npm run migrate:roles && npx ts-node scripts/migrate-pm-ids.ts
5. Start API: npm run dev
6. Configure app/.env: VITE_API_URL=http://localhost:3000/api
7. Start UI: cd ../app && npm run dev
`);
}

function printWarnings(): void {
    console.log('\n--- Warnings ---');
    console.log(
        '• RBAC role is stored as "Project Manager" (space), not "Project_Manager" — required for JWT/RBAC.'
    );
    console.log(
        '• scripts/seed.ts is outdated (wrong field names) — use seed:dev instead.'
    );
    console.log(
        '• scripts/uat-load.ts creates bulk uat-load-* data — do not run on same DB unless intended.'
    );
    console.log(
        '• Dashboard "hours this week" uses current UTC week — seed includes draft in week 0.'
    );
}

async function main(): Promise<void> {
    try {
        const summary = await seed();

        console.log('\n========================================');
        console.log('SEED SUMMARY');
        console.log('========================================');
        console.log(JSON.stringify(summary, null, 2));

        console.log('\n--- Login credentials ---');
        console.log('| Role     | Email              | Password   |');
        console.log('|----------|--------------------|------------|');
        for (const u of Object.values(USERS)) {
            console.log(`| ${u.access.padEnd(8)} | ${u.email.padEnd(18)} | ${PASSWORD_PLAIN} |`);
        }

        printDependencyGraph();
        printExecutionOrder();
        printWarnings();

        await mongoose.disconnect();
        console.log('\nSeed complete. MongoDB disconnected.\n');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        await mongoose.disconnect().catch(() => undefined);
        process.exit(1);
    }
}

main();
