
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Skill } from '../src/modules/skills/skill.model';
import { Role } from '../src/modules/roles/role.model';
import { Employee } from '../src/modules/employees/employee.model';
import { EmployeeSkill } from '../src/modules/employees/employee-skill.model';
import { Project } from '../src/modules/projects/project.model';
import { ProjectSkillRequirement } from '../src/modules/projects/project-skill-requirement.model';
import { ProjectRoleEffort } from '../src/modules/projects/project-role-effort.model';
import { SkillLevel } from '../src/common/types/enums';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        // 1. Ensure Skills exist
        const skillNames = ['React', 'NodeJS', 'Python', 'Java', 'Docker', 'AWS', 'TypeScript', 'MongoDB'];
        const skills = [];
        for (const name of skillNames) {
            let s = await Skill.findOne({ name });
            if (!s) {
                s = await Skill.create({ name, category: 'Technical', is_active: true });
                console.log(`Created skill: ${name}`);
            }
            skills.push(s);
        }

        // 2. Ensure Roles exist
        const roleData = [
            { role_name: 'Backend Engineer', department: 'Engineering' },
            { role_name: 'Frontend Engineer', department: 'Engineering' },
            { role_name: 'Full Stack Engineer', department: 'Engineering' },
            { role_name: 'DevOps Engineer', department: 'Engineering' },
            { role_name: 'QA Engineer', department: 'Engineering' },
            { role_name: 'Project Manager', department: 'Management' }
        ];
        const roles = [];
        for (const r of roleData) {
            let role = await Role.findOne({ role_name: r.role_name });
            if (!role) {
                role = await Role.create({ ...r, is_active: true });
                console.log(`Created role: ${r.role_name}`);
            }
            roles.push(role);
        }

        // 3. Update Employees with Roles and Skills
        const employees = await Employee.find({});
        console.log(`Found ${employees.length} employees to update`);

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const role = roles[i % roles.length];

            await Employee.findByIdAndUpdate(emp._id, { role_id: role._id });

            // Give each employee 2-3 skills
            const empSkills = skills.slice(i % skills.length, (i % skills.length) + 3);
            for (let j = 0; j < empSkills.length; j++) {
                const s = empSkills[j];
                const exists = await EmployeeSkill.findOne({ employee_id: emp._id, skill_id: s._id });
                if (!exists) {
                    await EmployeeSkill.create({
                        employee_id: emp._id,
                        skill_id: s._id,
                        skill_level: j === 0 ? SkillLevel.EXPERT : SkillLevel.INTERMEDIATE,
                        experience_years: 2 + j,
                        is_primary: j === 0
                    });
                }
            }
            console.log(`Updated employee ${emp.first_name} with role ${role.role_name} and skills`);
        }

        // 4. Add Dummy Requirements to a Project (BlueOrbit)
        const project = await Project.findOne({ project_name: 'BlueOrbit' });
        if (project) {
            console.log('Adding requirements to BlueOrbit');

            // Clear existing requirements for demo purposes
            await ProjectSkillRequirement.deleteMany({ project_id: project._id });
            await ProjectRoleEffort.deleteMany({ project_id: project._id });

            // Add Skill Requirements
            const skillReqs = [
                { skill: 'Java', level: SkillLevel.BEGINNER, count: 2, days: 14 },
                { skill: 'React', level: SkillLevel.INTERMEDIATE, count: 2, days: 29 },
                { skill: 'Docker', level: SkillLevel.EXPERT, count: 2, days: 19 }
            ];

            for (const req of skillReqs) {
                const s = await Skill.findOne({ name: req.skill });
                if (s) {
                    await ProjectSkillRequirement.create({
                        project_id: project._id,
                        skill_id: s._id,
                        min_skill_level: req.level,
                        required_headcount: req.count,
                        required_days: req.days
                    });
                }
            }

            // Add Role Efforts
            const roleEffs = [
                { name: 'Full Stack Engineer', count: 2, days: 14, hours: 8 },
                { name: 'Backend Engineer', count: 2, days: 28, hours: 8 }
            ];

            for (const eff of roleEffs) {
                const r = await Role.findOne({ role_name: eff.name });
                if (r) {
                    await ProjectRoleEffort.create({
                        project_id: project._id,
                        role_id: r._id,
                        required_headcount: eff.count,
                        required_days: eff.days,
                        hours_per_day: eff.hours
                    });
                }
            }
            console.log('BlueOrbit requirements seeded');
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
