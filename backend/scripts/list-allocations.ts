import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/resource-360';

async function listAllAllocations() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const Role = mongoose.model('Role', new mongoose.Schema({ role_name: String }, { collection: 'roles' }));
        const Employee = mongoose.model('Employee', new mongoose.Schema({ first_name: String, last_name: String }, { collection: 'employees' }));
        const Project = mongoose.model('Project', new mongoose.Schema({ project_name: String }, { collection: 'projects' }));
        const Allocation = mongoose.model('Allocation', new mongoose.Schema({
            project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
            employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
            role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
            allocation_percent: Number,
            start_date: Date,
            end_date: Date
        }, { collection: 'allocations' }));

        const allAllocations = await Allocation.find({})
            .populate('project_id')
            .populate('employee_id')
            .populate('role_id');

        console.log(`Total Allocations found: ${allAllocations.length}`);

        allAllocations.forEach((alloc: any) => {
            console.log(`Project: ${alloc.project_id?.project_name || alloc.project_id}, Employee: ${alloc.employee_id?.first_name} ${alloc.employee_id?.last_name}, Role: ${alloc.role_id?.role_name}, Percent: ${alloc.allocation_percent}%`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

listAllAllocations();
