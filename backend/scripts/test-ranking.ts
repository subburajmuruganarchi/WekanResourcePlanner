import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { AllocationService } from '../src/modules/allocations/allocation.service';
import '../src/modules/employees/employee.model';
import '../src/modules/employees/employee-skill.model';
import '../src/modules/skills/skill.model';
import '../src/modules/roles/role.model';
import '../src/modules/projects/project.model';
import '../src/modules/projects/project-skill-requirement.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/resource-360';

async function testRankingLogic() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const service = new AllocationService();
        const blueOrbitId = '6986cf2db3dc33b7a6dc85f5';

        const results = await service.rankEmployees({ projectId: blueOrbitId });

        console.log('\n--- Ranking Results (Top 10) ---');
        results.slice(0, 10).forEach(emp => {
            console.log(`Employee: ${emp.name}`);
            console.log(`  Matching Skills: ${JSON.stringify(emp.matchingSkills)}`);
            console.log(`  Match Score: ${emp.matchScore}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testRankingLogic();
