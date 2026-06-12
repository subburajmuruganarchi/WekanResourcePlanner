import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Employee } from '../src/modules/employees/employee.model';
import { Role } from '../src/modules/roles/role.model';

async function listCredentials() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('ERROR: MONGO_URI not set');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);

    const roles = await Role.find();
    // Use role_name as per IRole interface, with a fallback
    const roleIdMap = new Map(roles.map(r => [r._id.toString(), (r as any).role_name || (r as any).name || 'Unknown Role']));

    const employees = await Employee.find({ is_active: true });
    
    const roleMap = new Map<string, any>();
    
    for (const emp of employees) {
        let roleName = 'User (No Role)';
        if (emp.role_id) {
            roleName = roleIdMap.get(emp.role_id.toString()) || 'Unknown Role';
        }
        
        if (!roleMap.has(roleName)) {
            roleMap.set(roleName, {
                name: `${emp.first_name} ${emp.last_name}`.trim(),
                email: emp.email,
                password: 'password123'
            });
        }
    }

    let output = '\n--- Available Credentials by Role ---\n';
    output += 'Note: All accounts currently use the default password: password123\n\n';
    
    roleMap.forEach((creds, role) => {
        output += `Role: ${role}\n`;
        output += `  Name:     ${creds.name}\n`;
        output += `  Email:    ${creds.email}\n`;
        output += `  Password: ${creds.password}\n`;
        output += '-----------------------------------\n';
    });

    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, 'credentials.md'), output);
    console.log('Credentials written to credentials.md');

    await mongoose.disconnect();
    process.exit(0);
}

listCredentials().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
