/**
 * Ensure the 3 system access roles exist in the roles collection.
 * Safe to run multiple times (uses upsert).
 *
 * Usage: npx ts-node scripts/ensure-system-roles.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Role } from '../src/modules/roles/role.model';

const SYSTEM_ROLES = [
    { role_name: 'Employee', description: 'Standard employee access', is_active: true },
    { role_name: 'Project Manager', description: 'Project management access', is_active: true },
    { role_name: 'Admin', description: 'Full administrative access', is_active: true },
];

async function ensureSystemRoles() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGO_URI not set');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.\n');

    for (const role of SYSTEM_ROLES) {
        const result = await Role.findOneAndUpdate(
            { role_name: role.role_name },
            { $setOnInsert: role },
            { upsert: true, new: true }
        );
        const wasNew = result.created_at?.getTime() === result.updated_at?.getTime();
        console.log(`${wasNew ? 'CREATED' : 'EXISTS '} → ${role.role_name} (${result._id})`);
    }

    console.log('\nDone. System roles are ready.');
    await mongoose.disconnect();
    process.exit(0);
}

ensureSystemRoles().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
