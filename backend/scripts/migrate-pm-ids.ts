import mongoose from 'mongoose';
import { TimeEntry } from '../src/modules/time-entries/time-entry.model';
import { Project } from '../src/modules/projects/project.model';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/r360';
    console.log(`Connecting to ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Starting migration...');

    const projects = await Project.find({}).lean();
    console.log(`Found ${projects.length} projects.`);

    for (const project of projects) {
        console.log(`Processing project: ${project.project_name} (${project._id})`);
        const result = await TimeEntry.updateMany(
            { projectId: project._id, projectManagerUserId: { $exists: false } },
            { $set: { projectManagerUserId: project.project_manager_id } }
        );
        console.log(`Updated ${result.modifiedCount} entries.`);
    }

    console.log('Migration complete.');
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
