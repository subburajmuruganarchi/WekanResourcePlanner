
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/resource-360';

// Define schemas manually to avoid model registration issues
const SkillSchema = new mongoose.Schema({
    name: String,
    category: String,
    is_active: Boolean
}, { collection: 'skills' });

const ProjectSchema = new mongoose.Schema({
    project_code: String,
    project_name: String,
    status: String
}, { collection: 'projects' });

const ProjectSkillRequirementSchema = new mongoose.Schema({
    project_id: mongoose.Schema.Types.ObjectId,
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    min_skill_level: String,
    required_headcount: Number,
    required_days: Number
}, { collection: 'project_skill_requirements' });

const EmployeeSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    is_active: Boolean
}, { collection: 'employees' });

const EmployeeSkillSchema = new mongoose.Schema({
    employee_id: mongoose.Schema.Types.ObjectId,
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    skill_level: String,
    is_primary: Boolean
}, { collection: 'employee_skills' });

const Skill = mongoose.model('Skill', SkillSchema);
const Project = mongoose.model('Project', ProjectSchema);
const ProjectSkillRequirement = mongoose.model('ProjectSkillRequirement', ProjectSkillRequirementSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);
const EmployeeSkill = mongoose.model('EmployeeSkill', EmployeeSkillSchema);

async function debug() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Check Projects
        const projects = await Project.find().lean();
        console.log(`\nFound ${projects.length} projects:`);
        for (const p of projects) {
            const reqs = await ProjectSkillRequirement.find({ project_id: p._id }).populate('skill_id').lean();
            console.log(`- Project: ${p.project_name} (${p.project_code})`);
            console.log(`  Requirements Count: ${reqs.length}`);
            reqs.forEach((r) => {
                console.log(`    * Skill: ${r.skill_id ? r.skill_id.name : 'N/A'} (ID: ${r.skill_id ? r.skill_id._id : 'MISSING'}), Level: ${r.min_skill_level}`);
            });
        }

        // Check Employees and their skills
        const employees = await Employee.find({ is_active: { $ne: false } }).limit(5).lean();
        console.log(`\nSample Employees (max 5):`);
        for (const e of employees) {
            const skills = await EmployeeSkill.find({ employee_id: e._id }).populate('skill_id').lean();
            console.log(`- Employee: ${e.first_name} ${e.last_name}`);
            skills.forEach((s) => {
                console.log(`    * Skill: ${s.skill_id ? s.skill_id.name : 'N/A'} (ID: ${s.skill_id ? s.skill_id._id : 'MISSING'}), Primary: ${s.is_primary}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

debug();
