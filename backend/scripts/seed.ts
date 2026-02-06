/**
 * Canonical Data Seed Script for R360
 * 
 * Creates minimal seed data to unlock all E2E flows:
 * - 2 Skills (React, Node.js)
 * - 2 Roles (Frontend Developer, Backend Developer)
 * - 2 Employees (different roles/skills)
 * - 1 Project (active, with skill requirements)
 * - 1 Allocation (valid < 100%)
 * - 1 TimeCode (billable)
 * 
 * Usage: npx ts-node scripts/seed.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import { Skill } from '../src/modules/skills/skill.model';
import { Role } from '../src/modules/roles/role.model';
import { Employee } from '../src/modules/employees/employee.model';
import { Project, ProjectSkillRequirement } from '../src/modules/projects/project.model';
import { ProjectAllocation } from '../src/modules/allocations/allocation.model';
import { TimeCode } from '../src/modules/time-entries/time-code.model';
import { SkillType, SkillLevel, ProjectStatus, ProjectPriority } from '../src/common/types/enums';

async function seed() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGO_URI not set');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data (DEV ONLY)
    console.log('\n--- Clearing existing data ---');
    await Promise.all([
        Skill.deleteMany({}),
        Role.deleteMany({}),
        Employee.deleteMany({}),
        Project.deleteMany({}),
        ProjectSkillRequirement.deleteMany({}),
        ProjectAllocation.deleteMany({}),
        TimeCode.deleteMany({}),
    ]);
    console.log('Collections cleared');

    // 1. Create Skills
    console.log('\n--- Creating Skills ---');
    const [reactSkill, nodeSkill] = await Skill.create([
        { name: 'React', category: 'Frontend', isActive: true },
        { name: 'Node.js', category: 'Backend', isActive: true },
    ]);
    console.log(`Skill: React -> ${reactSkill._id}`);
    console.log(`Skill: Node.js -> ${nodeSkill._id}`);

    // 2. Create Roles
    console.log('\n--- Creating Roles ---');
    const [frontendRole, backendRole] = await Role.create([
        { name: 'Frontend Developer', defaultRate: 100, isActive: true },
        { name: 'Backend Developer', defaultRate: 120, isActive: true },
    ]);
    console.log(`Role: Frontend Developer -> ${frontendRole._id}`);
    console.log(`Role: Backend Developer -> ${backendRole._id}`);

    // 3. Create TimeCodes
    console.log('\n--- Creating TimeCodes ---');
    const [billableCode] = await TimeCode.create([
        { code: 'BILLABLE', description: 'Billable Project Work', isBillable: true },
    ]);
    console.log(`TimeCode: BILLABLE -> ${billableCode._id}`);

    // 4. Create Employees
    console.log('\n--- Creating Employees ---');
    const [employee1, employee2] = await Employee.create([
        {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice.smith@r360.dev',
            title: 'Senior Frontend Developer',
            roles: [frontendRole._id],
            skills: [
                { skillId: reactSkill._id, type: SkillType.PRIMARY, level: SkillLevel.EXPERT },
                { skillId: nodeSkill._id, type: SkillType.SECONDARY, level: SkillLevel.INTERMEDIATE },
            ],
            resourceId: 'EMP-001',
            isActive: true,
            experienceYears: 5,
        },
        {
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@r360.dev',
            title: 'Backend Developer',
            roles: [backendRole._id],
            skills: [
                { skillId: nodeSkill._id, type: SkillType.PRIMARY, level: SkillLevel.EXPERT },
                { skillId: reactSkill._id, type: SkillType.SECONDARY, level: SkillLevel.BEGINNER },
            ],
            resourceId: 'EMP-002',
            isActive: true,
            experienceYears: 3,
        },
    ]);
    console.log(`Employee: Alice Smith -> ${employee1._id}`);
    console.log(`Employee: Bob Johnson -> ${employee2._id}`);

    // 5. Create Project
    console.log('\n--- Creating Project ---');
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-12-31');
    const [project] = await Project.create([
        {
            code: 'PRJ-001',
            name: 'E-Commerce Platform',
            clientName: 'Acme Corp',
            startDate,
            endDate,
            status: ProjectStatus.ACTIVE,
            priority: ProjectPriority.HIGH,
            managerId: employee1._id,
        },
    ]);
    console.log(`Project: E-Commerce Platform -> ${project._id}`);

    // 6. Create Project Skill Requirement
    console.log('\n--- Creating Project Skill Requirements ---');
    const [skillReq] = await ProjectSkillRequirement.create([
        {
            projectId: project._id,
            skillId: reactSkill._id,
            level: SkillLevel.INTERMEDIATE,
            requiredCount: 2,
            startDate,
            endDate,
        },
    ]);
    console.log(`Skill Requirement: React for PRJ-001 -> ${skillReq._id}`);

    // 7. Create Allocation
    console.log('\n--- Creating Allocation ---');
    const [allocation] = await ProjectAllocation.create([
        {
            projectId: project._id,
            employeeId: employee1._id,
            roleId: frontendRole._id,
            startDate,
            endDate,
            percentage: 50,
            isActive: true,
        },
    ]);
    console.log(`Allocation: Alice -> PRJ-001 (50%) -> ${allocation._id}`);

    // Summary
    console.log('\n===================================');
    console.log('SEED COMPLETE - Real Object IDs:');
    console.log('===================================');
    console.log(`REACT_SKILL_ID=${reactSkill._id}`);
    console.log(`NODE_SKILL_ID=${nodeSkill._id}`);
    console.log(`FRONTEND_ROLE_ID=${frontendRole._id}`);
    console.log(`BACKEND_ROLE_ID=${backendRole._id}`);
    console.log(`TIMECODE_BILLABLE_ID=${billableCode._id}`);
    console.log(`EMPLOYEE_ALICE_ID=${employee1._id}`);
    console.log(`EMPLOYEE_BOB_ID=${employee2._id}`);
    console.log(`PROJECT_ID=${project._id}`);
    console.log(`ALLOCATION_ID=${allocation._id}`);
    console.log('===================================\n');

    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
