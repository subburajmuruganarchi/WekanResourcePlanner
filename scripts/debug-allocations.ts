
import mongoose from 'mongoose';
import { Project } from '../backend/src/modules/projects/project.model';
import { ProjectSkillRequirement } from '../backend/src/modules/projects/project-skill-requirement.model';
import { Employee } from '../backend/src/modules/employees/employee.model';
import { EmployeeSkill } from '../backend/src/modules/employees/employee-skill.model';
import { Skill } from '../backend/src/modules/skills/skill.model';

const MONGO_URI = 'mongodb://localhost:27017/resource-360';

async function debug() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Check Projects
        const projects = await Project.find().lean();
        console.log(`\nFound ${projects.length} projects:`);
        for (const p of projects) {
            const reqs = await ProjectSkillRequirement.find({ project_id: p._id }).populate('skill_id').lean();
            console.log(`- Project: ${p.project_name} (${p.project_code})`);
            console.log(`  Requirements Count: ${reqs.length}`);
            reqs.forEach((r: any) => {
                console.log(`    * Skill: ${r.skill_id?.name || 'N/A'} (ID: ${r.skill_id?._id || r.skill_id}), Level: ${r.min_skill_level}`);
            });
        }

        // Check Employees and their skills
        const employees = await Employee.find({ is_active: { $ne: false } }).limit(5).lean();
        console.log(`\nSample Employees (max 5):`);
        for (const e of employees) {
            const skills = await EmployeeSkill.find({ employee_id: e._id }).populate('skill_id').lean();
            console.log(`- Employee: ${e.first_name} ${e.last_name}`);
            skills.forEach((s: any) => {
                console.log(`    * Skill: ${s.skill_id?.name || 'N/A'} (ID: ${s.skill_id?._id || s.skill_id}), Primary: ${s.is_primary}`);
            });
        }

        // Test Ranking Logic mock
        const targetSkill = 'React';
        console.log(`\nTesting mock ranking for skill: ${targetSkill}`);
        const allSkills = await EmployeeSkill.find().populate('skill_id').lean();
        const matches = allSkills.filter((s: any) => s.skill_id?.name?.toLowerCase() === targetSkill.toLowerCase());
        console.log(`Found ${matches.length} employees with ${targetSkill} (any priority)`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

debug();
