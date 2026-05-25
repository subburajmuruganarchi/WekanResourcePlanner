/**
 * Verify R360 dev seed data — read-only checks.
 *
 * Usage: npm run verify:seed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Role } from '../src/modules/roles/role.model';
import { Employee } from '../src/modules/employees/employee.model';
import { Project } from '../src/modules/projects/project.model';
import { ProjectAllocation } from '../src/modules/allocations/allocation.model';
import { TimeCode } from '../src/modules/time-entries/time-code.model';
import { TimeEntry } from '../src/modules/time-entries/time-entry.model';
import { Notification } from '../src/modules/notifications/notification.model';
import { ProjectRoleEffort } from '../src/modules/projects/project-role-effort.model';
import { TimeEntryStatus } from '../src/common/types/enums';
import { runSystemVerify, buildHealthSummary } from '../src/modules/system/system.service';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SEED_TAG = 'dev-seed-v1';

const EXPECTED_EMAILS = ['admin@r360.com', 'pm@r360.com', 'employee@r360.com'] as const;
const EXPECTED_ACCESS_ROLES: Record<(typeof EXPECTED_EMAILS)[number], string> = {
    'admin@r360.com': 'Admin',
    'pm@r360.com': 'Project Manager',
    'employee@r360.com': 'Employee',
};

const REQUIRED_TIME_CODES = ['DEV', 'MEETING', 'TESTING', 'SUPPORT'];

type Verdict = 'PASS' | 'WARN' | 'FAIL';

interface CheckResult {
    name: string;
    verdict: Verdict;
    detail: string;
}

const results: CheckResult[] = [];

function add(name: string, verdict: Verdict, detail: string): void {
    results.push({ name, verdict, detail });
}

function resolveMongoUri(): string {
    const uri = process.env.MONGO_URI?.trim() || process.env.DATABASE_URL?.trim();
    if (!uri) {
        throw new Error('MONGO_URI or DATABASE_URL is required in backend/.env');
    }
    return uri;
}

function overallVerdict(): Verdict {
    if (results.some((r) => r.verdict === 'FAIL')) return 'FAIL';
    if (results.some((r) => r.verdict === 'WARN')) return 'WARN';
    return 'PASS';
}

async function verify(): Promise<void> {
    console.log(`\n=== R360 Verify Seed (${SEED_TAG}) ===\n`);

    await mongoose.connect(resolveMongoUri());

    // --- Roles ---
    const roleCount = await Role.countDocuments({ is_active: true });
    add(
        'roles count',
        roleCount >= 4 ? 'PASS' : 'FAIL',
        `active roles: ${roleCount} (expect Admin, Project Manager, Employee, Developer)`
    );

    for (const [email, expectedRole] of Object.entries(EXPECTED_ACCESS_ROLES)) {
        const emp = await Employee.findOne({ email }).populate<{ role_id: { role_name: string } }>(
            'role_id'
        );
        if (!emp) {
            add(`user ${email}`, 'FAIL', 'employee not found — run npm run seed:dev');
            continue;
        }
        const roleName = emp.role_id?.role_name ?? 'NONE';
        const hasPassword = !!(await Employee.findOne({ email }).select('+password'));
        if (roleName !== expectedRole) {
            add(`user ${email}`, 'FAIL', `role is "${roleName}", expected "${expectedRole}"`);
        } else if (!hasPassword) {
            add(`user ${email}`, 'FAIL', 'password not set');
        } else if (!emp.is_active) {
            add(`user ${email}`, 'WARN', 'employee is inactive');
        } else {
            add(`user ${email}`, 'PASS', `role=${roleName}, active, password set`);
        }
    }

    const usersCount = await Employee.countDocuments({ email: { $in: [...EXPECTED_EMAILS] } });
    add('seed users count', usersCount === 3 ? 'PASS' : 'FAIL', `found ${usersCount}/3 seed users`);

    // --- Projects & allocations ---
    const projectsCount = await Project.countDocuments({ project_code: /^R360-/ });
    add(
        'projects count',
        projectsCount >= 2 ? 'PASS' : 'FAIL',
        `R360-* projects: ${projectsCount}`
    );

    const roleEffortsOnSeedProjects = await ProjectRoleEffort.countDocuments({
        project_id: {
            $in: (
                await Project.find({ project_code: { $in: ['R360-ALPHA', 'R360-BETA'] } }).select('_id')
            ).map((p) => p._id),
        },
    });
    add(
        'project role efforts',
        roleEffortsOnSeedProjects >= 2 ? 'PASS' : 'FAIL',
        `role efforts on seed projects: ${roleEffortsOnSeedProjects}`
    );

    const seedEmployee = await Employee.findOne({ email: 'employee@r360.com' }).populate('job_role_id');
    if (seedEmployee) {
        const jobName = (seedEmployee.job_role_id as { role_name?: string } | null)?.role_name;
        add(
            'employee job role',
            jobName === 'Developer' ? 'PASS' : 'WARN',
            `employee@r360.com job_role: ${jobName ?? 'not set'}`
        );
    }

    const allocationsCount = seedEmployee
        ? await ProjectAllocation.countDocuments({
              employee_id: seedEmployee._id,
              is_active: true,
          })
        : 0;
    add(
        'allocations count',
        allocationsCount >= 1 ? 'PASS' : 'FAIL',
        `active allocations for employee@r360.com: ${allocationsCount}`
    );

    const employeesCount = await Employee.countDocuments({ is_active: true });
    add(
        'employees count',
        employeesCount >= 3 ? 'PASS' : 'WARN',
        `active employees (all): ${employeesCount}`
    );

    // --- Time codes ---
    const timeCodesCount = await TimeCode.countDocuments({ code: { $in: REQUIRED_TIME_CODES } });
    add(
        'time_codes count',
        timeCodesCount === 4 ? 'PASS' : 'FAIL',
        `required codes found: ${timeCodesCount}/4 (${REQUIRED_TIME_CODES.join(', ')})`
    );

    // --- Time entry statuses (seed-tagged) ---
    const seedEntryFilter = { comments: { $regex: `^${SEED_TAG}:` } };
    const draftCount = await TimeEntry.countDocuments({
        ...seedEntryFilter,
        status: TimeEntryStatus.DRAFT,
    });
    const submittedCount = await TimeEntry.countDocuments({
        ...seedEntryFilter,
        status: TimeEntryStatus.SUBMITTED,
    });
    const approvedCount = await TimeEntry.countDocuments({
        ...seedEntryFilter,
        status: TimeEntryStatus.PM_APPROVED,
    });
    const rejectedCount = await TimeEntry.countDocuments({
        ...seedEntryFilter,
        status: TimeEntryStatus.PM_REJECTED,
    });

    add('Draft count', draftCount >= 1 ? 'PASS' : 'FAIL', `seed Draft: ${draftCount}`);
    add('Submitted count', submittedCount >= 1 ? 'PASS' : 'FAIL', `seed Submitted: ${submittedCount}`);
    add('PM_Approved count', approvedCount >= 1 ? 'PASS' : 'FAIL', `seed PM_Approved: ${approvedCount}`);
    add('PM_Rejected count', rejectedCount >= 1 ? 'PASS' : 'FAIL', `seed PM_Rejected: ${rejectedCount}`);

    const submittedMissingPm = await TimeEntry.countDocuments({
        status: TimeEntryStatus.SUBMITTED,
        $or: [{ projectManagerUserId: { $exists: false } }, { projectManagerUserId: null }],
    });
    add(
        'Submitted PM linkage',
        submittedMissingPm === 0 ? 'PASS' : 'FAIL',
        `Submitted without projectManagerUserId: ${submittedMissingPm}`
    );

    // --- Notifications ---
    const notificationsCount = await Notification.countDocuments({
        message: { $regex: `^${SEED_TAG}:` },
    });
    add(
        'notifications count',
        notificationsCount >= 3 ? 'PASS' : 'WARN',
        `seed notifications: ${notificationsCount}`
    );

    // --- System health (optional integration) ---
    try {
        const verify = await runSystemVerify();
        add(
            'system verify',
            verify.status === 'PASS' ? 'PASS' : verify.status === 'WARN' ? 'WARN' : 'FAIL',
            verify.issues.length ? verify.issues.join('; ') : 'no issues'
        );
        const health = await buildHealthSummary();
        add(
            'system health-summary',
            health.overallStatus === 'healthy'
                ? 'PASS'
                : health.overallStatus === 'warning'
                  ? 'WARN'
                  : 'FAIL',
            health.warnings.join('; ') || 'healthy'
        );
    } catch (e) {
        add('system diagnostics', 'WARN', `skipped: ${e instanceof Error ? e.message : String(e)}`);
    }

    // --- Report ---
    console.log('Checks:\n');
    for (const r of results) {
        const icon = r.verdict === 'PASS' ? '✓' : r.verdict === 'WARN' ? '!' : '✗';
        console.log(`  ${icon} [${r.verdict}] ${r.name}: ${r.detail}`);
    }

    const overall = overallVerdict();
    console.log(`\n========================================`);
    console.log(`OVERALL: ${overall}`);
    console.log(`========================================\n`);

    if (overall === 'FAIL') {
        console.log('Reasons: one or more required checks failed. Run: npm run seed:dev\n');
    } else if (overall === 'WARN') {
        console.log('Reasons: non-blocking warnings present. Review before UAT.\n');
    }

    await mongoose.disconnect();
    process.exit(overall === 'FAIL' ? 1 : 0);
}

verify().catch((err) => {
    console.error('Verify failed:', err);
    mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
