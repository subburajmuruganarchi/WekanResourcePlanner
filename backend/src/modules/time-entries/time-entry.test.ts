import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { timeEntryService, CreateTimeEntryRequest } from './time-entry.service';
import { TimeEntry } from './time-entry.model';
import { Project } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { TimeCode } from './time-code.model';
import { ProjectAllocation } from '../allocations/allocation.model';
import { Role } from '../roles/role.model';
import { Skill } from '../skills/skill.model';
import { TimeEntryStatus, ProjectStatus, ProjectPriority, SkillType, SkillLevel } from '../../common/types/enums';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

describe('TimeEntryService - Integration', () => {
    let employeeId: Types.ObjectId;
    let projectId: Types.ObjectId;
    let timeCodeId: Types.ObjectId;
    let allocationId: Types.ObjectId;

    // Fixtures
    let testSkill: any;
    let testRole: any;
    let testEmployee: any;
    let testProject: any;
    let testTimeCode: any;
    let testManager: any;

    beforeAll(async () => {
        // Connect to MongoDB
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI not set');
        }
        await mongoose.connect(process.env.MONGO_URI);

        // Create isolated fixtures (Unique suffix)
        const suffix = Date.now().toString();

        // 1. Master Data
        [testSkill] = await Skill.create([{ name: `TESkill_${suffix}`, category: 'Test', isActive: true }]);
        [testRole] = await Role.create([{ name: `TERole_${suffix}`, defaultRate: 50, isActive: true }]);

        [testTimeCode] = await TimeCode.create([{
            code: `TC-${suffix}`,
            name: 'Billable Test',
            description: 'Test Time Code',
            isBillable: true,
            isActive: true
        }]);
        timeCodeId = testTimeCode._id;

        // 2. Employees
        [testManager] = await Employee.create([{
            firstName: 'TE', lastName: 'Manager', email: `te_manager_${suffix}@test.com`,
            title: 'Manager', isActive: true, resourceId: `TEMGR-${suffix}`,
            skills: [{ skillId: testSkill._id, type: 'Primary' as SkillType, level: 'Expert' as SkillLevel }],
            _id: new Types.ObjectId()
        }]);

        [testEmployee] = await Employee.create([{
            firstName: 'TE', lastName: 'Employee', email: `te_employee_${suffix}@test.com`,
            title: 'Dev', isActive: true, resourceId: `TEEMP-${suffix}`,
            roles: [testRole._id],
            skills: [{ skillId: testSkill._id, type: 'Primary' as SkillType, level: 'Expert' as SkillLevel }],
            _id: new Types.ObjectId()
        }]);
        employeeId = testEmployee._id;

        // 3. Project
        [testProject] = await Project.create([{
            code: `TEPRJ-${suffix}`, name: `Time Entry Project ${suffix}`, clientName: 'Test Client',
            startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
            status: ProjectStatus.ACTIVE, priority: ProjectPriority.MEDIUM,
            managerId: testManager._id,
            _id: new Types.ObjectId()
        }]);
        projectId = testProject._id;

        // 4. Allocation (Required for logging time)
        const [allocation] = await ProjectAllocation.create([{
            projectId,
            employeeId,
            roleId: testRole._id,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            percentage: 100,
            isActive: true
        }]);
        allocationId = allocation._id;
    });

    afterAll(async () => {
        // Cleanup
        if (employeeId) await TimeEntry.deleteMany({ employeeId });
        if (allocationId) await ProjectAllocation.deleteMany({ _id: allocationId });
        if (projectId) await Project.deleteOne({ _id: projectId });
        if (employeeId) await Employee.deleteOne({ _id: employeeId });
        if (testManager?._id) await Employee.deleteOne({ _id: testManager._id });
        if (testRole?._id) await Role.deleteOne({ _id: testRole._id });
        if (testSkill?._id) await Skill.deleteOne({ _id: testSkill._id });
        if (timeCodeId) await TimeCode.deleteOne({ _id: timeCodeId });

        await mongoose.disconnect();
    });

    beforeEach(async () => {
        // Clean up any existing time entries for this employee/project to ensure clean slate
        await TimeEntry.deleteMany({ employeeId });
    });

    afterEach(async () => {
        // Clean up created entries
        if (employeeId) {
            await TimeEntry.deleteMany({ employeeId });
        }
    });

    it('should create a valid time entry for allocated project', async () => {
        const request: CreateTimeEntryRequest = {
            employeeId: employeeId.toString(),
            projectId: projectId.toString(),
            timeCodeId: timeCodeId.toString(),
            date: '2026-01-15', // Within allocation (2026)
            hours: 8,
            comments: 'Development work'
        };

        const result = await timeEntryService.createTimeEntry(request);

        expect(result).toBeDefined();
        expect(result.hours).toBe(8);
        expect(result.status).toBe(TimeEntryStatus.DRAFT);

        // Verify persistence
        const saved = await TimeEntry.findById(result.id);
        expect(saved).toBeDefined();
        expect(saved?.hours).toBe(8);
        expect(saved?.status).toBe(TimeEntryStatus.DRAFT);
    });

    it('should fail when logging time for unallocated project (by date)', async () => {
        // Allocation is for 2026. Try 2025.
        const request: CreateTimeEntryRequest = {
            employeeId: employeeId.toString(),
            projectId: projectId.toString(),
            timeCodeId: timeCodeId.toString(),
            date: '2025-01-15', // Outside allocated dates
            hours: 8,
            comments: 'Future work'
        };

        await expect(timeEntryService.createTimeEntry(request))
            .rejects
            .toThrow(/Employee is not allocated/);
    });

    it('should enforce weekly hour cap of 40h', async () => {
        // 1. Log 40 hours (Mon-Fri) - Week starting 2026-01-12
        const days = ['2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16'];
        for (const date of days) {
            await timeEntryService.createTimeEntry({
                employeeId: employeeId.toString(),
                projectId: projectId.toString(),
                timeCodeId: timeCodeId.toString(),
                date,
                hours: 8
            });
        }

        // 2. Try to log 1 more hour on Saturday (same week)
        const request: CreateTimeEntryRequest = {
            employeeId: employeeId.toString(),
            projectId: projectId.toString(),
            timeCodeId: timeCodeId.toString(),
            date: '2026-01-17', // Saturday
            hours: 1,
            comments: 'Overtime attempt'
        };

        await expect(timeEntryService.createTimeEntry(request))
            .rejects
            .toThrow(/Weekly hour cap \(40h\) exceeded/);
    });
});
