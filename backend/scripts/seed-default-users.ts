/**
 * Ensure admin@r360.com and pm@r360.com exist in MongoDB (idempotent).
 *
 * Usage: npm run seed:default-users
 *
 * Note: The API also runs this automatically on server start.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ensureDefaultSystemUsers } from '../src/modules/employees/default-users.bootstrap';
import { PASSWORD_PLAIN } from '../src/services/planner-import/planner-import.utils';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main(): Promise<void> {
    const uri = process.env.MONGO_URI?.trim() || process.env.DATABASE_URL?.trim();
    if (!uri) {
        throw new Error('MONGO_URI or DATABASE_URL is required in backend/.env');
    }

    await mongoose.connect(uri);
    await ensureDefaultSystemUsers();

    console.log('\nDefault system users ensured:');
    console.log(`  admin@r360.com  — Admin            — ${PASSWORD_PLAIN}`);
    console.log(`  pm@r360.com     — Project Manager  — ${PASSWORD_PLAIN}\n`);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
