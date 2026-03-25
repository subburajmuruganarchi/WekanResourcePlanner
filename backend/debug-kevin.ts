import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';

dotenv.config();

async function debugKevin() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to DB');

        const kevins = await Employee.find({ 
            $or: [
                { first_name: /Kevin/i },
                { last_name: /Jose/i }
            ]
        }).populate('role_id');

        console.log('--- Current Users matching Kevin/Jose ---');
        for (const k of kevins) {
            console.log(`ID: ${k._id}`);
            console.log(`Name: ${k.first_name} ${k.last_name}`);
            console.log(`Email: ${k.email}`);
            console.log(`Role Name: ${(k.role_id as any)?.role_name}`);
            console.log(`Google ID: ${k.google_id}`);
            console.log('------------------------------------');
        }

        const adminRole = await Role.findOne({ role_name: 'Admin' });
        console.log('Admin Role ID:', adminRole?._id);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

debugKevin();
