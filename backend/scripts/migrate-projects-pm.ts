/**
 * Migration Script: Assign project_manager_id to existing projects.
 * For projects that already have a project_owner_id, use that as the PM.
 * For projects without an owner, assign the first active employee as fallback.
 * 
 * Usage: npx ts-node scripts/migrate-projects-pm.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Project } from '../src/modules/projects/project.model';
import { Employee } from '../src/modules/employees/employee.model';

async function migrate() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGO_URI not set');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all projects without project_manager_id
    const projects = await Project.find({ project_manager_id: { $exists: false } });
    console.log(`Found ${projects.length} projects without a PM.`);

    if (projects.length === 0) {
        console.log('Nothing to migrate.');
        await mongoose.disconnect();
        process.exit(0);
    }

    // Get a fallback employee (first active one)
    const fallbackEmployee = await Employee.findOne({ is_active: true });
    if (!fallbackEmployee) {
        console.error('ERROR: No active employees found for fallback PM assignment.');
        process.exit(1);
    }

    let updated = 0;
    for (const proj of projects) {
        // Use existing owner as PM, or fallback
        const pmId = proj.project_owner_id || fallbackEmployee._id;
        await Project.updateOne(
            { _id: proj._id },
            { $set: { project_manager_id: pmId } }
        );
        console.log(`  Updated "${proj.project_name}" -> PM: ${pmId}`);
        updated++;
    }

    console.log(`\nMigration complete. Updated ${updated} projects.`);
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
