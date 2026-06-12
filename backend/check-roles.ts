import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';

dotenv.config();

async function checkRoles() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to DB');

        const roles = await Role.find({});
        const kevin = await Employee.findOne({ email: 'kevinj@wekancode.com' }).populate('role_id');

        const output = {
            roles: roles.map(r => ({ id: r._id, name: r.role_name })),
            kevin: kevin ? {
                id: kevin._id,
                name: `${kevin.first_name} ${kevin.last_name}`,
                email: kevin.email,
                role: (kevin.role_id as any)?.role_name,
                google_id: kevin.google_id
            } : 'Not Found'
        };

        console.log(JSON.stringify(output, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkRoles();
