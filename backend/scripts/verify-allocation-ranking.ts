
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { allocationService } from '../src/modules/allocations/allocation.service';
import { Project } from '../src/modules/projects/project.model';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyRanking() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected.');

        // Get a project ID to test with
        const project = await Project.findOne();
        if (!project) {
            console.log('No projects found to test with.');
            return;
        }
        console.log(`Testing with project: ${project.project_name} (${project._id})`);

        console.log('Calling rankEmployees...');
        const ranked = await allocationService.rankEmployees({
            projectId: project._id.toString(),
            // skillName: 'React' // Optional: test with a skill
        });

        console.log(`Found ${ranked.length} ranked employees.`);

        if (ranked.length > 0) {
            console.log('Top 3 ranked employees:');
            ranked.slice(0, 3).forEach(emp => {
                console.log('---');
                console.log(`Name: ${emp.name}`);
                console.log(`Role: ${emp.role}`);
                console.log(`Primary Skill: ${emp.primarySkill}`);
                console.log(`Skill Level: ${emp.skillLevel}`);
                console.log(`Experience Years: ${emp.experienceYears}`);
                console.log(`Match Score: ${emp.matchScore}`);
                console.log(`Factors:`, emp.factors);
                console.log(`Current Allocations:`, emp.currentAllocations);
            });
        }

    } catch (error) {
        console.error('Error verifying ranking:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

verifyRanking();
