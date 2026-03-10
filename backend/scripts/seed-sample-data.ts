
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Manual Load of Models to avoid import issues
const RoleSchema = new mongoose.Schema({}, { strict: false });
const Role = mongoose.model('Role', RoleSchema, 'roles');

const SkillSchema = new mongoose.Schema({}, { strict: false });
const Skill = mongoose.model('Skill', SkillSchema, 'skills');

const EmployeeSchema = new mongoose.Schema({}, { strict: false });
const Employee = mongoose.model('Employee', EmployeeSchema, 'employees');

const ProjectSchema = new mongoose.Schema({}, { strict: false });
const Project = mongoose.model('Project', ProjectSchema, 'projects');

const EmployeeSkillSchema = new mongoose.Schema({
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    skill_level: String,
    experience_years: Number,
    is_primary: Boolean
}, { collection: 'employee_skills' });
const EmployeeSkill = mongoose.model('EmployeeSkill', EmployeeSkillSchema);

const SkillRequirementSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    min_skill_level: String,
    required_headcount: Number,
    required_days: Number
}, { collection: 'project_skill_requirements' });
const SkillRequirement = mongoose.model('SkillRequirement', SkillRequirementSchema);

const RoleEffortSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    required_headcount: Number,
    required_days: Number,
    hours_per_day: Number
}, { collection: 'project_role_efforts' });
const RoleEffort = mongoose.model('RoleEffort', RoleEffortSchema);

async function seed() {
    dotenv.config({ path: path.join(__dirname, '../.env') });

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not defined');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const allSkills = await Skill.find({ is_active: true }).lean();
        const allRoles = await Role.find({ is_active: true }).lean();
        const allEmployees = await Employee.find({ is_active: true }).lean();
        const allProjects = await Project.find({ is_active: true }).lean();

        console.log(`Found ${allSkills.length} skills, ${allRoles.length} roles, ${allEmployees.length} employees, ${allProjects.length} projects.`);

        if (allSkills.length === 0 || allRoles.length === 0) {
            console.error('No active skills or roles found to seed from.');
            return;
        }

        // 1. Seed Employee Skills
        console.log('Seeding employee skills...');
        for (const emp of allEmployees as any[]) {
            // Check if already has skills
            const existingCount = await EmployeeSkill.countDocuments({ employee_id: emp._id });
            if (existingCount > 0) {
                console.log(`Employee ${emp.first_name} already has ${existingCount} skills. Skipping.`);
                continue;
            }

            // Pick 2-4 random skills
            const numSkills = Math.floor(Math.random() * 3) + 2;
            const shuffledSkills = [...allSkills].sort(() => 0.5 - Math.random());
            const selectedSkills = shuffledSkills.slice(0, numSkills);

            for (let i = 0; i < selectedSkills.length; i++) {
                await EmployeeSkill.create({
                    employee_id: emp._id,
                    skill_id: (selectedSkills[i] as any)._id,
                    skill_level: ['Beginner', 'Intermediate', 'Expert'][Math.floor(Math.random() * 3)],
                    experience_years: Math.floor(Math.random() * 10) + 1,
                    is_primary: i === 0 // First one is primary
                });
            }
            console.log(`Added ${numSkills} skills to ${emp.first_name} ${emp.last_name}`);
        }

        // 2. Seed Project Requirements
        console.log('Seeding project requirements...');
        for (const proj of allProjects as any[]) {
            const existingSkillsCount = await SkillRequirement.countDocuments({ project_id: proj._id });
            const existingRolesCount = await RoleEffort.countDocuments({ project_id: proj._id });

            if (existingSkillsCount > 0 || existingRolesCount > 0) {
                console.log(`Project ${proj.project_name} already has requirements. Skipping.`);
                continue;
            }

            // Pick 2-3 random skills
            const numSkills = Math.floor(Math.random() * 2) + 2;
            const shuffledSkills = [...allSkills].sort(() => 0.5 - Math.random());
            const selectedSkills = shuffledSkills.slice(0, numSkills);

            for (const skill of selectedSkills) {
                await SkillRequirement.create({
                    project_id: proj._id,
                    skill_id: (skill as any)._id,
                    min_skill_level: ['Beginner', 'Intermediate', 'Expert'][Math.floor(Math.random() * 3)],
                    required_headcount: Math.floor(Math.random() * 2) + 1,
                    required_days: Math.floor(Math.random() * 20) + 10
                });
            }

            // Pick 1-2 random roles
            const numRoles = Math.floor(Math.random() * 2) + 1;
            const shuffledRoles = [...allRoles].sort(() => 0.5 - Math.random());
            const selectedRoles = shuffledRoles.slice(0, numRoles);

            for (const role of selectedRoles) {
                await RoleEffort.create({
                    project_id: proj._id,
                    role_id: (role as any)._id,
                    required_headcount: Math.floor(Math.random() * 2) + 1,
                    required_days: Math.floor(Math.random() * 20) + 10,
                    hours_per_day: 8
                });
            }
            console.log(`Added ${numSkills} skills and ${numRoles} roles to ${proj.project_name}`);
        }

        console.log('Seeding Complete.');

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seed();
