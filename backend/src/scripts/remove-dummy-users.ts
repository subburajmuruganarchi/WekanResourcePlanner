
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Employee } from '../modules/employees/employee.model';
import { EmployeeSkill } from '../modules/employees/employee-skill.model';
import { ProjectAllocation } from '../modules/allocations/allocation.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        // Identify dummy users (employee_code starts with 'Z' or name starts with 'z ')
        const dummyQuery = {
            $or: [
                { employee_code: /^Z/i },
                { first_name: /^z$/i }
            ]
        };

        const dummies = await Employee.find(dummyQuery);
        const dummyIds = dummies.map(d => d._id);

        console.log(`Found ${dummies.length} dummy users to remove.`);

        if (dummies.length > 0) {
            // 1. Remove allocations
            const allocResult = await ProjectAllocation.deleteMany({ employee_id: { $in: dummyIds } });
            console.log(`Deleted ${allocResult.deletedCount} associated allocations.`);

            // 2. Remove skills
            const skillResult = await EmployeeSkill.deleteMany({ employee_id: { $in: dummyIds } });
            console.log(`Deleted ${skillResult.deletedCount} associated skill mappings.`);

            // 3. Remove employees
            const empResult = await Employee.deleteMany({ _id: { $in: dummyIds } });
            console.log(`Deleted ${empResult.deletedCount} dummy employees.`);
        }

        console.log('Cleanup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}

cleanup();
