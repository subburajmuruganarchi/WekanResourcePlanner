import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { allocationService, CreateAllocationRequest, UpdateAllocationRequest } from './allocation.service';
import { ProjectAllocation, AllocationOverrideLog } from './allocation.model';
import { Project, ProjectSkillRequirement } from '../projects/project.model';
import { Employee } from '../employees/employee.model';
import { Role } from '../roles/role.model';
import { Skill } from '../skills/skill.model';
import { ProjectStatus, ProjectPriority, SkillType, SkillLevel } from '../../common/types/enums';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

describe('AllocationService - Integration', () => {
    // Shared variables used in tests
    let roleId: Types.ObjectId;
    let employeeId: Types.ObjectId;
    let projectId: Types.ObjectId;
    let managerId: Types.ObjectId;

    // Test Fixtures
    let testProject: any;
    let testEmployee: any;
    let testManager: any;
    let testRole: any;
    let testSkill: any;

    beforeAll(async () => {
        // Connect to MongoDB
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI not set');
        }
        await mongoose.connect(process.env.MONGO_URI);

        // Create isolated test fixtures
        const suffix = Date.now().toString();

        [testSkill] = await Skill.create([{ name: `TestSkill_${suffix}`, category: 'Test', isActive: true }]);
        [testRole] = await Role.create([{ name: `TestRole_${suffix}`, defaultRate: 50, isActive: true }]);

        [testManager] = await Employee.create([{
            firstName: 'Test', lastName: 'Manager', email: `manager_${suffix}@test.com`,
            title: 'Manager', isActive: true, resourceId: `MGR-${suffix}`,
            skills: [{
                skillId: testSkill._id,
                type: 'Primary' as SkillType,
                level: 'Expert' as SkillLevel
            }],
            _id: new Types.ObjectId()
        }]);
        managerId = testManager._id;

        // Use literals for Enums to avoid Jest import issues
        [testEmployee] = await Employee.create([{
            firstName: 'Test', lastName: 'Employee', email: `employee_${suffix}@test.com`,
            title: 'Dev', isActive: true, resourceId: `EMP-${suffix}`,
            roles: [testRole._id],
            skills: [{
                skillId: testSkill._id,
                type: 'Primary' as SkillType,
                level: 'Expert' as SkillLevel
            }],
            _id: new Types.ObjectId()
        }]);
        employeeId = testEmployee._id;
        roleId = testRole._id;

        [testProject] = await Project.create([{
            code: `PRJ-${suffix}`, name: `Test Project ${suffix}`, clientName: 'Test Client',
            startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
            status: ProjectStatus.ACTIVE, priority: ProjectPriority.MEDIUM,
            managerId: managerId,
            _id: new Types.ObjectId()
        }]);
        projectId = testProject._id;
    });

    afterAll(async () => {
        // Cleanup fixtures
        await ProjectAllocation.deleteMany({ projectId });
        await AllocationOverrideLog.deleteMany({ projectId });
        await Project.deleteOne({ _id: projectId });
        await Employee.deleteOne({ _id: employeeId });
        await Employee.deleteOne({ _id: managerId });
        await Role.deleteOne({ _id: roleId });
        await Skill.deleteOne({ _id: testSkill._id });

        await mongoose.disconnect();
    });

    beforeEach(async () => {
        // Cleanup any allocations created during tests
        await ProjectAllocation.deleteMany({ projectId });
        await AllocationOverrideLog.deleteMany({ projectId });
    });

    afterEach(async () => {
        // Cleanup created allocations
        if (projectId && employeeId) {
            await ProjectAllocation.deleteMany({ projectId, employeeId });
            await AllocationOverrideLog.deleteMany({ projectId });
        }
    });

    it('should create a valid allocation successfully', async () => {
        const request: CreateAllocationRequest = {
            projectId: projectId.toString(),
            employeeId: employeeId.toString(),
            roleId: roleId.toString(),
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            percentage: 50
        };

        const result = await allocationService.createAllocation(request);

        expect(result).toBeDefined();
        expect(result.employeeId).toBe(employeeId.toString());
        expect(result.percentage).toBe(50);
        expect(result.isActive).toBe(true);

        // Verify persistence
        const saved = await ProjectAllocation.findById(result.id);
        expect(saved).toBeDefined();
        expect(saved?.percentage).toBe(50);
    });

    it('should fail when allocating beyond 100% capacity', async () => {
        // 1. Create initial 60% allocation
        await allocationService.createAllocation({
            projectId: projectId.toString(),
            employeeId: employeeId.toString(),
            roleId: roleId.toString(),
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            percentage: 60
        });

        // 2. Try to add another 50% (Total 110%) without override
        const request: CreateAllocationRequest = {
            projectId: projectId.toString(),
            employeeId: employeeId.toString(),
            roleId: roleId.toString(),
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            percentage: 50
        };

        await expect(allocationService.createAllocation(request))
            .rejects
            .toThrow(/Allocation would exceed 100% capacity/);
    });

    it('should allow over-allocation with admin override and create audit log', async () => {
        // 1. Create initial 80% allocation
        await allocationService.createAllocation({
            projectId: projectId.toString(),
            employeeId: employeeId.toString(),
            roleId: roleId.toString(),
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            percentage: 80
        });

        // 2. Add 30% with override (Total 110%)
        const request: CreateAllocationRequest = {
            projectId: projectId.toString(),
            employeeId: employeeId.toString(),
            roleId: roleId.toString(),
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            percentage: 30,
            isAdminOverride: true,
            overrideReason: 'Critical project need approved by CTO',
            authorizedById: managerId.toString()
        };

        const result = await allocationService.createAllocation(request);

        expect(result.percentage).toBe(30);

        // 3. Verify Audit Log
        const logs = await AllocationOverrideLog.find({ allocationId: result.id });
        expect(logs).toHaveLength(1);
        expect(logs[0].reason).toBe('Critical project need approved by CTO');
        expect(logs[0].requestedPercentage).toBe(30);
    });
});
