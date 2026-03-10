
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/resource-360';

// Define schemas manually
const SkillSchema = new mongoose.Schema({ name: String }, { collection: 'skills' });
const EmployeeSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    department: String
}, { collection: 'employees' });
const EmployeeSkillSchema = new mongoose.Schema({
    employee_id: mongoose.Schema.Types.ObjectId,
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    skill_level: String,
    experience_years: Number,
    is_primary: Boolean
}, { collection: 'employee_skills' });
const ProjectAllocationSchema = new mongoose.Schema({
    employee_id: mongoose.Schema.Types.ObjectId,
    allocation_percent: Number,
    is_active: Boolean,
    end_date: Date
}, { collection: 'employee_allocations' }); // Fixed collection name if needed

const Skill = mongoose.model('Skill', SkillSchema);
const Employee = mongoose.model('Employee', EmployeeSchema);
const EmployeeSkill = mongoose.model('EmployeeSkill', EmployeeSkillSchema);
const ProjectAllocation = mongoose.model('ProjectAllocation', ProjectAllocationSchema);

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const skill = await Skill.findOne({ name: 'Java' });
        if (!skill) {
            console.log('Java skill not found, trying Python...');
            const altSkill = await Skill.findOne({ name: 'Python' });
            if (!altSkill) {
                console.error('No test skills found.');
                return;
            }
            testSkill(altSkill);
        } else {
            await testSkill(skill);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

async function testSkill(skill) {
    console.log(`Testing ranking for skill: ${skill.name} (${skill._id})`);

    // We can't easily use the service directly here because of imports
    // So we'll simulate the logic for verification
    const employees = await Employee.find({ is_active: { $ne: false } }).lean();
    console.log(`Analyzing ${employees.length} employees...`);

    const results = [];

    for (const emp of employees) {
        const skills = await EmployeeSkill.find({ employee_id: emp._id }).populate('skill_id').lean();

        let matchScore = 0;
        let matched = false;
        let pSkill = 'N/A';

        const targetSkillLower = skill.name.toLowerCase();
        const primaryMatch = skills.find(s => s.is_primary && s.skill_id && s.skill_id.name.toLowerCase() === targetSkillLower);

        if (primaryMatch) {
            matchScore = 40;
            matched = true;
            pSkill = primaryMatch.skill_id.name;
        } else {
            const secondaryMatch = skills.find(s => s.skill_id && s.skill_id.name.toLowerCase() === targetSkillLower);
            if (secondaryMatch) {
                matchScore = 30;
                matched = true;
                pSkill = secondaryMatch.skill_id.name;
            }
        }

        if (matched) {
            results.push({
                name: `${emp.first_name} ${emp.last_name}`,
                score: matchScore,
                skill: pSkill,
                isPrimary: !!primaryMatch
            });
        }
    }

    results.sort((a, b) => b.score - a.score);

    console.log(`\nMatching Employees for ${skill.name}:`);
    results.forEach(r => {
        console.log(`- ${r.name}: Score=${r.score} (Match: ${r.isPrimary ? 'Primary' : 'Secondary'})`);
    });
}

verify();
