
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Employee } from '../src/modules/employees/employee.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
    await mongoose.connect(process.env.MONGO_URI!);
    const count = await Employee.countDocuments();
    const firstEmp = await Employee.findOne({ employee_code: 'E001' });
    console.log(`Total Employees: ${count}`);
    console.log(`E001 Found: ${!!firstEmp}`);
    if (firstEmp) console.log(`E001 Name: ${firstEmp.first_name} ${firstEmp.last_name}`);
    process.exit(0);
}

verify();
