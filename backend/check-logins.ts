import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';

dotenv.config();

async function checkLogins() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        // Import all models to ensure they are registered
        require('./src/modules/employees/employee.model');
        require('./src/modules/roles/role.model');
        require('./src/modules/projects/project.model');

        const loggedInUsers = await Employee.find({ google_id: { $exists: true, $ne: null } }).populate('role_id');
        console.log('--- USERS LOGGED IN VIA GOOGLE ---');
        loggedInUsers.forEach(u => {
            const roleName = (u.role_id as any)?.role_name || 'NOT_POPULATED';
            console.log(`Email: ${u.email}`);
            console.log(`  Name: ${u.first_name} ${u.last_name}`);
            console.log(`  Role in DB: ${roleName}`);
            console.log(`  Raw Role ID: ${u.role_id?._id || u.role_id}`);
            console.log('------------------------------------');
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkLogins();
