import mongoose from 'mongoose';
import { Employee } from './src/modules/employees/employee.model';
import { Role } from './src/modules/roles/role.model';
import dotenv from 'dotenv';

dotenv.config();

async function updateKevin() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to DB');

        let adminRole = await Role.findOne({ role_name: 'Admin' });
        if (!adminRole) {
            console.log('Admin role not found, looking for Leadership...');
            adminRole = await Role.findOne({ role_name: 'Leadership' });
        }

        if (!adminRole) {
             console.log('Leadership role not found, creating Admin role...');
             adminRole = await Role.create({
                 role_name: 'Admin',
                 is_active: true
             });
        }

        const kevin = await Employee.findOneAndUpdate(
            { email: 'kevinj@wekancode.com' },
            { role_id: adminRole._id },
            { new: true }
        );

        if (kevin) {
            console.log(`Kevin Jose updated to role: ${adminRole.role_name}`);
        } else {
            console.log('Kevin Jose not found');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

updateKevin();
