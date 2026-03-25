import mongoose from 'mongoose';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';

dotenv.config();

async function listRoles() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        const roles = await Role.find({});
        console.log('--- ROLES DUMP ---');
        roles.forEach(r => {
            console.log(JSON.stringify({
                id: r._id,
                name: r.role_name
            }));
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

listRoles();
