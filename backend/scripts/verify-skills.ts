
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Employee } from '../src/modules/employees/employee.model';
import { EmployeeSkill } from '../src/modules/employees/employee-skill.model';
import { Skill } from '../src/modules/skills/skill.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        const skillCount = await Skill.countDocuments();
        const mappingCount = await EmployeeSkill.countDocuments();
        
        console.log('--- Verification Report ---');
        console.log(`Total Master Skills: ${skillCount}`);
        console.log(`Total Employee-Skill Mappings: ${mappingCount}`);

        const sampleBatch = ['E001', 'E016', 'E043', 'E049'];
        for (const code of sampleBatch) {
            const emp = await Employee.findOne({ employee_code: code });
            if (emp) {
                const skills = await EmployeeSkill.find({ employee_id: emp._id }).populate('skill_id');
                const skillNames = skills.map((s: any) => s.skill_id.name).join(', ');
                console.log(`Employee ${code} (${emp.first_name}): [${skillNames}]`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
