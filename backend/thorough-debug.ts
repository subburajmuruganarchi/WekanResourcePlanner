import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';

dotenv.config();

async function thoroughDebug() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to DB');

        const roles = await Role.find({});
        console.log('--- ALL ROLES ---');
        roles.forEach(r => {
            console.log(`ID: ${r._id}, Name: "${r.role_name}"`);
        });

        const kevin = await Employee.findOne({ email: 'kevinj@wekancode.com' }).populate('role_id');
        console.log('\n--- KEVIN JOSE (by email kevinj@wekancode.com) ---');
        if (kevin) {
            console.log(`ID: ${kevin._id}`);
            console.log(`Email: ${kevin.email}`);
            console.log(`Role ID: ${kevin.role_id?._id || kevin.role_id}`);
            console.log(`Role Name: "${(kevin.role_id as any)?.role_name}"`);
        } else {
            console.log('Kevin Jose (kevinj@wekancode.com) NOT FOUND');
        }

        const allKevins = await Employee.find({ first_name: /Kevin/i }).populate('role_id');
        console.log('\n--- ALL USERS WITH FIRST NAME "KEVIN" ---');
        allKevins.forEach(k => {
            console.log(`ID: ${k._id}, Email: ${k.email}, Role: "${(k.role_id as any)?.role_name}"`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

thoroughDebug();
