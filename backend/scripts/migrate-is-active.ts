
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Manual Load of Models to avoid import issues
const RoleSchema = new mongoose.Schema({
    is_active: { type: Boolean, default: true },
    status: { type: String }
}, { strict: false });
const Role = mongoose.model('Role', RoleSchema, 'roles');

const SkillSchema = new mongoose.Schema({
    is_active: { type: Boolean, default: true },
    status: { type: String }
}, { strict: false });
const Skill = mongoose.model('Skill', SkillSchema, 'skills');

const EmployeeSchema = new mongoose.Schema({
    is_active: { type: Boolean, default: true },
    status: { type: String }
}, { strict: false });
const Employee = mongoose.model('Employee', EmployeeSchema, 'employees');

const ProjectSchema = new mongoose.Schema({
    is_active: { type: Boolean, default: true },
    status: { type: String },
    startDate: { type: Date },
    endDate: { type: Date }
}, { strict: false });
const Project = mongoose.model('Project', ProjectSchema, 'projects');

async function migrate() {
    dotenv.config({ path: path.join(__dirname, '../.env') });

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not defined');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Roles
        console.log('Migrating Roles...');
        const roleResult = await Role.updateMany(
            { status: 'Active', is_active: { $exists: false } }, // Only update if is_active is missing
            { $set: { is_active: true } }
        );
        console.log(`Updated ${roleResult.modifiedCount} roles to is_active: true`);

        // Handle inactive roles (if any)
        const roleInactiveResult = await Role.updateMany(
            { status: { $ne: 'Active' }, is_active: { $exists: false } },
            { $set: { is_active: false } }
        );
        console.log(`Updated ${roleInactiveResult.modifiedCount} inactive roles to is_active: false`);


        // 2. Skills
        console.log('Migrating Skills...');
        const skillResult = await Skill.updateMany(
            { status: 'Active', is_active: { $exists: false } },
            { $set: { is_active: true } }
        );
        console.log(`Updated ${skillResult.modifiedCount} skills to is_active: true`);


        // 3. Employees
        console.log('Migrating Employees...');
        const empResult = await Employee.updateMany(
            { status: 'Active', is_active: { $exists: false } },
            { $set: { is_active: true } }
        );
        console.log(`Updated ${empResult.modifiedCount} employees to is_active: true`);

        const empInactiveResult = await Employee.updateMany(
            { status: { $ne: 'Active' }, is_active: { $exists: false } },
            { $set: { is_active: false } }
        );
        console.log(`Updated ${empInactiveResult.modifiedCount} inactive employees to is_active: false`);


        // 4. Projects (Complex Logic: Check status AND dates)
        console.log('Migrating Projects...');
        // Set active if status is Active, Planning, or null (assuming default active)
        const projResult = await Project.updateMany(
            {
                $or: [{ status: 'Active' }, { status: 'Planning' }],
                is_active: { $exists: false }
            },
            { $set: { is_active: true } }
        );
        console.log(`Updated ${projResult.modifiedCount} projects to is_active: true`);

        const projInactiveResult = await Project.updateMany(
            {
                status: { $in: ['Completed', 'OnHold', 'Cancelled'] },
                is_active: { $exists: false }
            },
            { $set: { is_active: false } }
        );
        console.log(`Updated ${projInactiveResult.modifiedCount} inactive projects to is_active: false`);


        console.log('Migration Complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

migrate();
