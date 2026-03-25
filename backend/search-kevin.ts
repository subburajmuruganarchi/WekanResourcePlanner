import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import dotenv from 'dotenv';

dotenv.config();

async function searchKevin() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        require('./src/modules/roles/role.model');
        const employees = await Employee.find({
            $or: [
                { first_name: /Kevin/i },
                { last_name: /Jose/i },
                { email: /kevin/i }
            ]
        }).populate('role_id');

        console.log(JSON.stringify(employees.map(e => ({
            name: `${e.first_name} ${e.last_name}`,
            email: e.email,
            role: (e.role_id as any)?.role_name || 'NULL',
            google_id: e.google_id
        })), null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

searchKevin();
