
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Employee } from '../src/modules/employees/employee.model';
import { Role } from '../src/modules/roles/role.model';
import { ProjectAllocation } from '../src/modules/allocations/allocation.model';
import { EmployeeSkill } from '../src/modules/employees/employee-skill.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const NEW_EMPLOYEES = [
  {
    "_id": "E001",
    "first_name": "Babu",
    "last_name": "Reddy",
    "email": "babur@wekancode.com",
    "employee_code": "E001",
    "status": "Available",
    "department": "Backend",
    "position": "Architect",
    "is_active": true
  },
  {
    "_id": "E002",
    "first_name": "Ashwin",
    "last_name": "S",
    "email": "ashwins@wekancode.com",
    "employee_code": "E002",
    "status": "Available",
    "department": "Backend",
    "position": "Associate Architect",
    "is_active": true
  },
  {
    "_id": "E003",
    "first_name": "Shyam",
    "last_name": "Kumar",
    "email": "shyamk@wekancode.com",
    "employee_code": "E003",
    "status": "Not Available",
    "department": "Backend",
    "position": "Associate Architect",
    "is_active": false
  },
  {
    "_id": "E004",
    "first_name": "Abhishek",
    "last_name": "Kumar",
    "email": "abhishekk@wekancode.com",
    "employee_code": "E004",
    "status": "Available",
    "department": "Backend",
    "position": "Associate Architect",
    "is_active": true
  },
  {
    "_id": "E005",
    "first_name": "Abhishek",
    "last_name": "Pandit",
    "email": "abhishekp@wekancode.com",
    "employee_code": "E005",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE III (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E006",
    "first_name": "Satnam",
    "last_name": "Singh",
    "email": "satnams@wekancode.com",
    "employee_code": "E006",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE II (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E007",
    "first_name": "Navarathinam",
    "last_name": "C",
    "email": "navarathinamc@wekancode.com",
    "employee_code": "E007",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE II (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E008",
    "first_name": "Shashikumar",
    "last_name": "D E",
    "email": "shashik@wekancode.com",
    "employee_code": "E008",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E009",
    "first_name": "Shivathanu",
    "last_name": "G C",
    "email": "shivathanug@wekancode.com",
    "employee_code": "E009",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE II (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E010",
    "first_name": "Ashwini",
    "last_name": "Shekhawat",
    "email": "ashwinis@wekancode.com",
    "employee_code": "E010",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE II (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E011",
    "first_name": "Tarun",
    "last_name": "Teja",
    "email": "tarunt@wekancode.com",
    "employee_code": "E011",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E012",
    "first_name": "Kavinkumaar",
    "last_name": "P B",
    "email": "kavink@wekancode.com",
    "employee_code": "E012",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E013",
    "first_name": "Shubham",
    "last_name": "Singh",
    "email": "shubhamsingh@wekancode.com",
    "employee_code": "E013",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE II (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E014",
    "first_name": "Naga",
    "last_name": "Kartheek Yejandla",
    "email": "nagakartheek@wekancode.com",
    "employee_code": "E014",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E015",
    "first_name": "Sharma",
    "last_name": "S",
    "email": "sharmas@wekancode.com",
    "employee_code": "E015",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE II (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E016",
    "first_name": "Anand",
    "last_name": "Shirahatti",
    "email": "anands@wekancode.com",
    "employee_code": "E016",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E017",
    "first_name": "Sanjay",
    "last_name": "Verma",
    "email": "sanjayv@wekancode.com",
    "employee_code": "E017",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E018",
    "first_name": "Geetha",
    "last_name": "B",
    "email": "geethab@wekancode.com",
    "employee_code": "E018",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E019",
    "first_name": "Bhavani",
    "last_name": "Devi Yathapu",
    "email": "bhavanid@wekan.company",
    "employee_code": "E019",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E020",
    "first_name": "Pallav",
    "last_name": "Tripathi",
    "email": "pallavt@wekancode.com",
    "employee_code": "E020",
    "status": "Available",
    "department": "Frontend",
    "position": "SDE II (Frontend)",
    "is_active": true
  },
  {
    "_id": "E021",
    "first_name": "Anurag",
    "last_name": "Tripathi",
    "email": "anuragt@wekancode.com",
    "employee_code": "E021",
    "status": "Not Available",
    "department": "Frontend",
    "position": "SDE II (Frontend)",
    "is_active": false
  },
  {
    "_id": "E022",
    "first_name": "Suresh",
    "last_name": "KK",
    "email": "sureshk@wekancode.com",
    "employee_code": "E022",
    "status": "Available",
    "department": "Frontend",
    "position": "SDE II (Frontend)",
    "is_active": true
  },
  {
    "_id": "E023",
    "first_name": "Tanmoy",
    "last_name": "Barash",
    "email": "tanmoyb@wekan.company",
    "employee_code": "E023",
    "status": "Not Available",
    "department": "Frontend",
    "position": "SDE (Frontend)",
    "is_active": false
  },
  {
    "_id": "E024",
    "first_name": "Priyanshu",
    "last_name": "Yadav",
    "email": "priyanshuy@wekan.company",
    "employee_code": "E024",
    "status": "Available",
    "department": "DBA",
    "position": "DBA",
    "is_active": true
  },
  {
    "_id": "E025",
    "first_name": "Ramachandra",
    "last_name": "Naragund",
    "email": "ramachandran@wekancode.com",
    "employee_code": "E025",
    "status": "Available",
    "department": "Mobile",
    "position": "Mobile Architect",
    "is_active": true
  },
  {
    "_id": "E026",
    "first_name": "Nethaji",
    "last_name": "R",
    "email": "nethajir@wekancode.com",
    "employee_code": "E026",
    "status": "Available",
    "department": "Mobile",
    "position": "SDE III (Mobile)",
    "is_active": true
  },
  {
    "_id": "E027",
    "first_name": "Ramachandran",
    "last_name": "A",
    "email": "ramachandrana@wekancode.com",
    "employee_code": "E027",
    "status": "Available",
    "department": "Mobile",
    "position": "SDE II (Mobile)",
    "is_active": true
  },
  {
    "_id": "E028",
    "first_name": "Saipavan",
    "last_name": "Tej",
    "email": "saipavant@wekan.company",
    "employee_code": "E028",
    "status": "Not Available",
    "department": "Mobile",
    "position": "SDE (Mobile)",
    "is_active": false
  },
  {
    "_id": "E029",
    "first_name": "Heenakousar",
    "last_name": "M Makandar",
    "email": "heenakousarm@wekancode.com",
    "employee_code": "E029",
    "status": "Available",
    "department": "Mobile",
    "position": "SDE II (Mobile)",
    "is_active": true
  },
  {
    "_id": "E030",
    "first_name": "Subburaj",
    "last_name": "Murugan Reddiyar",
    "email": "subburajm@wekancode.com",
    "employee_code": "E030",
    "status": "Available",
    "department": "Mobile",
    "position": "SDE III (Mobile)",
    "is_active": true
  },
  {
    "_id": "E031",
    "first_name": "Sanjay",
    "last_name": "Mali",
    "email": "sanjaym@wekancode.com",
    "employee_code": "E031",
    "status": "Not Available",
    "department": "Mobile",
    "position": "Mobile Architect",
    "is_active": false
  },
  {
    "_id": "E032",
    "first_name": "Padmanabhan",
    "last_name": "N",
    "email": "padmanabhann@wekancode.com",
    "employee_code": "E032",
    "status": "Not Available",
    "department": "Mobile",
    "position": "SDE II (Mobile)",
    "is_active": false
  },
  {
    "_id": "E033",
    "first_name": "Krishna",
    "last_name": "Kumar",
    "email": "Krishnar@wekancode.com",
    "employee_code": "E033",
    "status": "Not Available",
    "department": "QA",
    "position": "QA Engineer",
    "is_active": false
  },
  {
    "_id": "E034",
    "first_name": "Prem",
    "last_name": "kumar",
    "email": "premkumark@wekancode.com",
    "employee_code": "E034",
    "status": "Available",
    "department": "QA",
    "position": "QA Engineer",
    "is_active": true
  },
  {
    "_id": "E035",
    "first_name": "Antony",
    "last_name": "M",
    "email": "antonym@wekancode.com",
    "employee_code": "E035",
    "status": "Not Available",
    "department": "QA",
    "position": "QA Engineer",
    "is_active": false
  },
  {
    "_id": "E037",
    "first_name": "Shrihari",
    "last_name": "Rao",
    "email": "shriharir@wekan.company",
    "employee_code": "E037",
    "status": "Available",
    "department": "Backend",
    "position": "SDE (Backend)",
    "is_active": true
  },
  {
    "_id": "E038",
    "first_name": "Madhivanan",
    "last_name": "B",
    "email": "madhivananb@wekancode.com",
    "employee_code": "E038",
    "status": "Available",
    "department": "Mobile",
    "position": "SDE II (Mobile)",
    "is_active": true
  },
  {
    "_id": "E039",
    "first_name": "Nandish",
    "last_name": "Asangi",
    "email": "nandisha@wekan.company",
    "employee_code": "E039",
    "status": "Not Available",
    "department": "Backend",
    "position": "Architect",
    "is_active": false
  },
  {
    "_id": "E040",
    "first_name": "Ravinder",
    "last_name": "Dahiya",
    "email": "ravinderd@wekan.company",
    "employee_code": "E040",
    "status": "Not Available",
    "department": "Backend",
    "position": "SDE III (Backend)",
    "is_active": false
  },
  {
    "_id": "E041",
    "first_name": "Tamilarasu",
    "last_name": "Ravi",
    "email": "tamilarasur@wekan.company",
    "employee_code": "E041",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E042",
    "first_name": "Sanath",
    "last_name": "Kumar T",
    "email": "sanathk@wekan.company",
    "employee_code": "E042",
    "status": "Not Available",
    "department": "DBA",
    "position": "MongoDB Database Administrator",
    "is_active": false
  },
  {
    "_id": "E043",
    "first_name": "Manish",
    "last_name": "Sharma",
    "email": "manishs@wekan.company",
    "employee_code": "E043",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE III (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E045",
    "first_name": "Charumathi",
    "last_name": "K",
    "email": "charumathik@wekan.company",
    "employee_code": "E045",
    "status": "Available",
    "department": "Fullstack",
    "position": "SDE (Full Stack)",
    "is_active": true
  },
  {
    "_id": "E046",
    "first_name": "Dipanshu",
    "last_name": "Jain",
    "email": "dipanshuj@wekan.company",
    "employee_code": "E046",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E047",
    "first_name": "Lakshmi",
    "last_name": "Prasanna",
    "email": "lakshmip@wekan.company",
    "employee_code": "E047",
    "status": "Available",
    "department": "Backend",
    "position": "SDE II (Backend)",
    "is_active": true
  },
  {
    "_id": "E048",
    "first_name": "Hemant",
    "last_name": "Jadhav",
    "email": "hemantj@wekan.company",
    "employee_code": "E048",
    "status": "Available",
    "department": "Frontend",
    "position": "SDE II (MERN)",
    "is_active": true
  },
  {
    "_id": "E049",
    "first_name": "Abhijit",
    "last_name": "Tivari",
    "email": "abhijitt@wekancode.com",
    "employee_code": "E049",
    "status": "Available",
    "department": "QA",
    "position": "QA Engineer",
    "is_active": true
  },
  {
    "_id": "Z001",
    "first_name": "z",
    "last_name": "Dummy Chief Architect",
    "employee_code": "Z001",
    "status": "required",
    "department": "z dummy",
    "position": "Chief Architect",
    "is_active": false
  },
  {
    "_id": "Z002",
    "first_name": "z",
    "last_name": "Dummy Chief Architect",
    "employee_code": "Z002",
    "status": "required",
    "department": "z dummy",
    "position": "Chief Architect",
    "is_active": false
  },
  {
    "_id": "Z003",
    "first_name": "z",
    "last_name": "Dummy Mobile Architect",
    "employee_code": "Z003",
    "status": "required",
    "department": "z dummy",
    "position": "Mobile Architect",
    "is_active": false
  },
  {
    "_id": "Z004",
    "first_name": "z",
    "last_name": "Dummy Associate Architect",
    "employee_code": "Z004",
    "status": "required",
    "department": "z dummy",
    "position": "Associate Architect",
    "is_active": false
  },
  {
    "_id": "Z005",
    "first_name": "z",
    "last_name": "Dummy SDE III (Full Stack)",
    "employee_code": "Z005",
    "status": "required",
    "department": "z dummy",
    "position": "SDE III (Full Stack)",
    "is_active": false
  },
  {
    "_id": "Z006",
    "first_name": "z",
    "last_name": "Dummy SDE II (Full Stack)",
    "employee_code": "Z006",
    "status": "required",
    "department": "z dummy",
    "position": "SDE II (Full Stack)",
    "is_active": false
  },
  {
    "_id": "Z007",
    "first_name": "z",
    "last_name": "Dummy SDE (Full Stack)",
    "employee_code": "Z007",
    "status": "required",
    "department": "z dummy",
    "position": "SDE (Full Stack)",
    "is_active": false
  },
  {
    "_id": "Z008",
    "first_name": "z",
    "last_name": "Dummy SDE III (Backend)",
    "employee_code": "Z008",
    "status": "required",
    "department": "z dummy",
    "position": "SDE III (Backend)",
    "is_active": false
  },
  {
    "_id": "Z009",
    "first_name": "z",
    "last_name": "Dummy SDE II (Backend)",
    "employee_code": "Z009",
    "status": "required",
    "department": "z dummy",
    "position": "SDE II (Backend)",
    "is_active": false
  },
  {
    "_id": "Z010",
    "first_name": "z",
    "last_name": "Dummy SDE (Backend)",
    "employee_code": "Z010",
    "status": "required",
    "department": "z dummy",
    "position": "SDE (Backend)",
    "is_active": false
  },
  {
    "_id": "Z011",
    "first_name": "z",
    "last_name": "Dummy SDE III (Frontend)",
    "employee_code": "Z011",
    "status": "required",
    "department": "z dummy",
    "position": "SDE III (Frontend)",
    "is_active": false
  },
  {
    "_id": "Z012",
    "first_name": "z",
    "last_name": "Dummy SDE II (Frontend)",
    "employee_code": "Z012",
    "status": "required",
    "department": "z dummy",
    "position": "SDE II (Frontend)",
    "is_active": false
  },
  {
    "_id": "Z013",
    "first_name": "z",
    "last_name": "Dummy SDE (Frontend)",
    "employee_code": "Z013",
    "status": "required",
    "department": "z dummy",
    "position": "SDE (Frontend)",
    "is_active": false
  },
  {
    "_id": "Z014",
    "first_name": "z",
    "last_name": "Dummy SDE III (Mobile)",
    "employee_code": "Z014",
    "status": "required",
    "department": "z dummy",
    "position": "SDE III (Mobile)",
    "is_active": false
  },
  {
    "_id": "Z015",
    "first_name": "z",
    "last_name": "Dummy SDE II (Mobile)",
    "employee_code": "Z015",
    "status": "required",
    "department": "z dummy",
    "position": "SDE II (Mobile)",
    "is_active": false
  },
  {
    "_id": "Z016",
    "first_name": "z",
    "last_name": "Dymmy Undefined Role",
    "employee_code": "Z016",
    "status": "required",
    "department": "z dummy",
    "position": "undefined",
    "is_active": false
  },
  {
    "_id": "Z017",
    "first_name": "z",
    "last_name": "Dummy SDE (Mobile)",
    "employee_code": "Z017",
    "status": "required",
    "department": "z dummy",
    "position": "SDE (Mobile)",
    "is_active": false
  },
  {
    "_id": "Z018",
    "first_name": "z",
    "last_name": "Dummy QA Engineer",
    "employee_code": "Z018",
    "status": "required",
    "department": "z dummy",
    "position": "QA Engineer",
    "is_active": false
  }
];

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        // 1. DELETE OLD DATA
        console.log('Deleting existing employees, skills, and allocations...');
        await Employee.deleteMany({});
        await EmployeeSkill.deleteMany({});
        await ProjectAllocation.deleteMany({});
        console.log('Cleaned up employees, employee_skills, and project_allocations.');

        // 2. PREPARE ROLES
        const hashedPassword = await bcrypt.hash('password123', 10);
        const uniquePositionNames = Array.from(new Set(NEW_EMPLOYEES.map(e => e.position)));
        
        console.log(`Mapping ${uniquePositionNames.length} unique roles...`);
        const roleMap: Record<string, mongoose.Types.ObjectId> = {};

        for (const pos of uniquePositionNames) {
            let role = await Role.findOne({ role_name: pos });
            if (!role) {
                // Find department for this role from first occurrence
                const emp = NEW_EMPLOYEES.find(e => e.position === pos);
                role = await Role.create({
                    role_name: pos,
                    department: emp?.department || 'Engineering',
                    is_active: true,
                    description: `${pos}`
                });
                console.log(`Created new Role: ${pos}`);
            }
            roleMap[pos] = role._id as mongoose.Types.ObjectId;
        }

        // 3. INSERT NEW EMPLOYEES
        console.log(`Inserting ${NEW_EMPLOYEES.length} new employees...`);
        const now = new Date();

        for (const empData of NEW_EMPLOYEES) {
            const roleId = roleMap[empData.position];

            await Employee.create({
                first_name: empData.first_name,
                last_name: empData.last_name,
                email: empData.email || `${(empData.employee_code || empData.first_name).toLowerCase()}@wekancode.com`,
                employee_code: empData.employee_code,
                status: empData.status || 'Active',
                department: empData.department,
                position: empData.position,
                is_active: empData.is_active,
                role_id: roleId,
                password: hashedPassword,
                join_date: now,
                max_allocation_percent: 100
            });
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
