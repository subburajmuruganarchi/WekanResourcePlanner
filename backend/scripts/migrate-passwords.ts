import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Employee } from '../src/modules/employees/employee.model';

async function migrate() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGO_URI not set');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const defaultPassword = 'password123';
    console.log(`Hashing default password: "${defaultPassword}"`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    console.log('Finding employees without passwords...');
    const employees = await Employee.find({ password: { $exists: false } }).select('+password');

    if (employees.length === 0) {
        console.log('No employees need password migration. All set!');
    } else {
        console.log(`Found ${employees.length} employees to migrate.`);

        let count = 0;
        for (const employee of employees) {
            employee.password = hashedPassword;
            await employee.save();
            count++;
        }

        console.log(`Successfully migrated ${count} employees with the default password.`);
    }

    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
