import mongoose from 'mongoose';
import { TimeEntry } from '../src/modules/time-entries/time-entry.model';
import { Project } from '../src/modules/projects/project.model';
import { TimeEntryStatus } from '../src/common/types/enums';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function benchmark() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/r360';
    await mongoose.connect(mongoUri);

    const project = await Project.findOne();
    
    if (!project || !project.project_manager_id) {
        console.error('Could not find a project or PM for the test. Please ensure seed data exists.');
        await mongoose.disconnect();
        return;
    }

    const pmUserId = project.project_manager_id.toString();

    console.log(`Seeding 10,000 entries for PM ${pmUserId} on project ${project.project_name}...`);
    
    // Clear existing test entries to avoid bloat
    await TimeEntry.deleteMany({ comments: 'BENCHMARK_TEST' });

    const entries = [];
    const now = new Date();
    for (let i = 0; i < 10000; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i % 365));
        
        entries.push({
            employeeId: project.project_manager_id, // simplified
            projectId: project._id,
            timeCodeId: new mongoose.Types.ObjectId(), // dummy
            date: date,
            hours: 8,
            comments: 'BENCHMARK_TEST',
            weekStartDate: new Date(date).setDate(date.getDate() - date.getDay() + 1),
            status: TimeEntryStatus.SUBMITTED,
            projectManagerUserId: project.project_manager_id
        });

        if (entries.length >= 1000) {
            await TimeEntry.insertMany(entries);
            entries.length = 0;
            process.stdout.write('.');
        }
    }
    console.log('\nSeed complete.');

    console.log('Benchmarking query...');
    const start = Date.now();
    const result = await TimeEntry.find({
        projectManagerUserId: new mongoose.Types.ObjectId(pmUserId),
        status: TimeEntryStatus.SUBMITTED
    }).lean();
    const end = Date.now();

    console.log(`Query returned ${result.length} entries.`);
    console.log(`Time taken: ${end - start}ms`);

    if (end - start < 1000) {
        console.log('SUCCESS: Performance requirement met (< 1s)');
    } else {
        console.error('FAILURE: Performance requirement NOT met (> 1s)');
    }

    // Cleanup
    await TimeEntry.deleteMany({ comments: 'BENCHMARK_TEST' });
    await mongoose.disconnect();
}

benchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
