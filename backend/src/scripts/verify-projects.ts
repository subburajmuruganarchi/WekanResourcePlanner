
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Project } from '../modules/projects/project.model';
import { ProjectAllocation } from '../modules/allocations/allocation.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        const projectCount = await Project.countDocuments();
        const allocationCount = await ProjectAllocation.countDocuments();
        
        console.log('--- Project Migration Report ---');
        console.log(`Total Projects: ${projectCount}`);
        console.log(`Total Allocations: ${allocationCount}`);

        // Sample check
        const pok = await Project.findOne({ project_code: 'P001' });
        console.log(`P001 (7-11 POC) Found: ${!!pok}`);
        if (pok) console.log(`P001 Status: ${pok.status}, Start: ${pok.start_date.toDateString()}`);

        const sampleAllocation = await ProjectAllocation.findOne({}).populate('employee_id project_id');
        if (sampleAllocation) {
            const emp = sampleAllocation.employee_id as any;
            const proj = sampleAllocation.project_id as any;
            console.log(`Sample Allocation: ${emp.first_name} ${emp.last_name} -> ${proj.project_name} (${sampleAllocation.allocation_percent}%)`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
