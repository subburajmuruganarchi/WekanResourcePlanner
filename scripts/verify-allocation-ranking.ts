
import mongoose from 'mongoose';
import { allocationService } from '../backend/src/modules/allocations/allocation.service';
import { Skill } from '../backend/src/modules/skills/skill.model';
import { Employee } from '../backend/src/modules/employees/employee.model';
import { EmployeeSkill } from '../backend/src/modules/employees/employee-skill.model';

const MONGO_URI = 'mongodb://localhost:27017/resource-360';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Find a skill to test with
        const skill = await Skill.findOne({ name: 'Java' });
        if (!skill) {
            console.error('Skill "Java" not found. Adjust script to an existing skill.');
            return;
        }

        console.log(`Testing ranking for skill: ${skill.name}`);

        // Get ranked employees
        const ranked = await allocationService.rankEmployees({
            projectId: new mongoose.Types.ObjectId().toString(), // Dummy ID
            skillName: skill.name
        });

        console.log(`Found ${ranked.length} total employees.`);

        // Pick top 5 and analyze
        const top5 = ranked.slice(0, 5);
        for (const emp of top5) {
            console.log(`- ${emp.name}: Score=${emp.matchScore}, Skill=${emp.primarySkill}, Availability=${emp.availability}%`);

            // Check if it was a primary or secondary match in DB
            const empSkill = await EmployeeSkill.findOne({
                employee_id: emp.id,
                skill_id: skill._id
            });

            if (empSkill) {
                console.log(`  Match Priority: ${empSkill.is_primary ? 'Primary' : 'Secondary'}`);
                // Verify points: 
                // score = (skillPoints + avail*35 + exp*25) / 100
                // We just check if Primary score > Secondary score for similar availability
            } else {
                console.log(`  No direct skill match record found (check logic!)`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

verify();
