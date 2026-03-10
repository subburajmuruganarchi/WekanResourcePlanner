import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Employee } from '../src/modules/employees/employee.model';
import { Role } from '../src/modules/roles/role.model';

async function createAdmin() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGO_URI not set');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);

    // 1. Create or find Admin role
    let adminRole = await Role.findOne({ role_name: 'Admin' });
    if (!adminRole) {
        adminRole = await Role.findOne({ name: 'Admin' });
    }

    if (!adminRole) {
        adminRole = await Role.create({
            role_name: 'Admin',
            name: 'Admin',
            department: 'Management',
            is_active: true
        });
        console.log('Created Admin role.');
    } else {
        console.log('Admin role already exists.');
    }

    // 2. Check if admin user exists
    let adminUser = await Employee.findOne({ email: 'admin@company.com' });

    if (!adminUser) {
        const defaultPassword = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        adminUser = await Employee.create({
            first_name: 'System',
            last_name: 'Admin',
            email: 'admin@company.com',
            password: hashedPassword,
            status: 'Active',
            role_id: adminRole._id,
            department: 'Management',
            position: 'Administrator',
            is_active: true
        });
        console.log('Created Admin user.');
    } else {
        console.log('Admin user already exists.');
    }

    console.log('\n--- Admin Credentials ---');
    console.log(`Name:     ${adminUser.first_name} ${adminUser.last_name}`);
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Password: password123`);
    console.log('-------------------------\n');

    await mongoose.disconnect();
    process.exit(0);
}

createAdmin().catch((err) => {
    console.error('Failed to create admin:', err);
    process.exit(1);
});
