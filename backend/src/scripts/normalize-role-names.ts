/**
 * One-time migration: rename role_name "ProjectManager" → "Project Manager"
 * Run: npx ts-node src/scripts/normalize-role-names.ts
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Role } from '../modules/roles/role.model';

async function main() {
    await mongoose.connect(env.MONGO_URI);
    const result = await Role.updateMany(
        { role_name: 'ProjectManager' },
        { $set: { role_name: 'Project Manager' } }
    );
    console.log(`Updated ${result.modifiedCount} role(s) from ProjectManager to "Project Manager".`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
