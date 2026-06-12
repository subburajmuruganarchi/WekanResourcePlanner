import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function roleDump() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        
        const employees = await Employee.find({}).populate('role_id');
        const roles = await Role.find({});

        const result = {
            roles: roles.map(r => ({ id: r._id, name: r.role_name })),
            employees: employees.map(e => ({
                id: e._id,
                name: `${e.first_name} ${e.last_name}`,
                email: e.email,
                role: (e.role_id as any)?.role_name || 'NULL',
                role_id: e.role_id?._id || e.role_id,
                google_id: e.google_id
            }))
        };

        fs.writeFileSync('full_dump.json', JSON.stringify(result, null, 2));
        console.log('Dumped to full_dump.json');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

roleDump();
