/**
 * UAT / local load simulation — NEVER run in production.
 *
 * Usage (manual only):
 *   UAT_LOAD_CONFIRM=true npx ts-node scripts/uat-load.ts
 *
 * Requires MONGO_URI in backend/.env
 * Creates prefixed test data: uat-load-* emails / project codes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Employee } from '../src/modules/employees/employee.model';
import { Role } from '../src/modules/roles/role.model';
import { Skill } from '../src/modules/skills/skill.model';
import { Project, ProjectSkillRequirement } from '../src/modules/projects/project.model';
import { ProjectAllocation } from '../src/modules/allocations/allocation.model';
import { TimeEntry } from '../src/modules/time-entries/time-entry.model';
import { TimeCode } from '../src/modules/time-entries/time-code.model';
import { Notification, NotificationType } from '../src/modules/notifications/notification.model';
import { TimeEntryStatus, ProjectStatus, ProjectPriority } from '../src/common/types/enums';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PREFIX = 'uat-load';

async function main() {
    if (process.env.UAT_LOAD_CONFIRM !== 'true') {
        console.error('Refusing to run: set UAT_LOAD_CONFIRM=true');
        process.exit(1);
    }
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run in production');
        process.exit(1);
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('MONGO_URI required');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected for UAT load simulation');

    const passwordHash = await bcrypt.hash('password123', 10);

    const accessRoles = ['Admin', 'Project Manager', 'Employee'] as const;
    const roleDocs: Record<string, mongoose.Types.ObjectId> = {};
    for (const name of accessRoles) {
        let role = await Role.findOne({ role_name: name });
        if (!role) {
            role = await Role.create({ role_name: name, is_active: true });
        }
        roleDocs[name] = role._id;
    }

    const devRole =
        (await Role.findOne({ role_name: 'Developer' })) ??
        (await Role.create({ role_name: 'Developer', is_active: true }));

    let skill = await Skill.findOne({ name: 'React' });
    if (!skill) {
        skill = await Skill.create({ name: 'React', category: 'Frontend', is_active: true });
    }

    let timeCode = await TimeCode.findOne({ code: 'BILLABLE' });
    if (!timeCode) {
        timeCode = await TimeCode.create({
            code: 'BILLABLE',
            description: 'Billable',
            isBillable: true,
        });
    }

    const pmIds: mongoose.Types.ObjectId[] = [];
    const employeeIds: mongoose.Types.ObjectId[] = [];

    for (let i = 1; i <= 100; i++) {
        const isPm = i <= 10;
        const email = `${PREFIX}-emp${i}@test.local`;
        let emp = await Employee.findOne({ email });
        if (!emp) {
            emp = await Employee.create({
                first_name: `UAT`,
                last_name: `Employee${i}`,
                email,
                password: passwordHash,
                status: 'Active',
                is_active: true,
                role_id: isPm ? roleDocs['Project Manager'] : roleDocs['Employee'],
                department: 'Engineering',
            });
        }
        employeeIds.push(emp._id);
        if (isPm) pmIds.push(emp._id);
    }

    const projectIds: mongoose.Types.ObjectId[] = [];
    for (let p = 1; p <= 25; p++) {
        const code = `${PREFIX.toUpperCase()}-P${String(p).padStart(2, '0')}`;
        const pmId = pmIds[(p - 1) % pmIds.length];
        let project = await Project.findOne({ project_code: code });
        if (!project) {
            project = await Project.create({
                project_name: `UAT Project ${p}`,
                project_code: code,
                project_owner_id: pmId,
                project_manager_id: pmId,
                status: ProjectStatus.ACTIVE,
                priority: ProjectPriority.MEDIUM,
                start_date: new Date('2025-01-01'),
                end_date: new Date('2026-12-31'),
            });
            await ProjectSkillRequirement.create({
                project_id: project._id,
                skill_id: skill._id,
                min_skill_level: 'Intermediate',
                required_headcount: 2,
                start_date: project.start_date,
                end_date: project.end_date,
            });
        }
        projectIds.push(project._id);
    }

    for (let i = 0; i < 40; i++) {
        const empId = employeeIds[i + 10];
        const projId = projectIds[i % projectIds.length];
        const exists = await ProjectAllocation.findOne({
            employee_id: empId,
            project_id: projId,
        });
        if (!exists) {
            await ProjectAllocation.create({
                project_id: projId,
                employee_id: empId,
                role_id: devRole._id,
                skill_id: skill._id,
                start_date: new Date('2025-01-01'),
                end_date: new Date('2026-06-30'),
                allocation_percent: 50,
                is_active: true,
            });
        }
    }

    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    const day = weekStart.getUTCDay();
    const diff = weekStart.getUTCDate() - day + (day === 0 ? -6 : 1);
    weekStart.setUTCDate(diff);

    const statuses: TimeEntryStatus[] = [
        TimeEntryStatus.DRAFT,
        TimeEntryStatus.SUBMITTED,
        TimeEntryStatus.PM_APPROVED,
    ];

    for (let t = 0; t < 150; t++) {
        const empId = employeeIds[10 + (t % 80)];
        const projId = projectIds[t % projectIds.length];
        const pmId = pmIds[t % pmIds.length];
        const status = statuses[t % statuses.length];
        const entryDate = new Date(weekStart);
        entryDate.setUTCDate(entryDate.getUTCDate() + (t % 5));

        await TimeEntry.create({
            employeeId: empId,
            projectId: projId,
            timeCodeId: timeCode._id,
            date: entryDate,
            hours: 4 + (t % 4),
            weekStartDate: weekStart,
            status,
            projectManagerUserId: pmId,
        });
    }

    for (let n = 0; n < 20; n++) {
        await Notification.create({
            userId: employeeIds[n % employeeIds.length],
            title: 'UAT notification',
            message: `Sample notification ${n + 1}`,
            type: NotificationType.INFO,
            read: n % 3 === 0,
        });
    }

    console.log('UAT load complete:', {
        employees: employeeIds.length,
        pms: pmIds.length,
        projects: projectIds.length,
        timeEntries: 150,
        notifications: 20,
    });
    console.log('Sample login: uat-load-emp1@test.local / password123 (PM if emp1-10)');

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
