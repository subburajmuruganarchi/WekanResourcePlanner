
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Project } from '../modules/projects/project.model';
import { Employee } from '../modules/employees/employee.model';
import { ProjectAllocation } from '../modules/allocations/allocation.model';
import { ProjectStatus, ProjectPriority, BillingType, AllocationType, CreatedByRole } from '../common/types/enums';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const PROJECTS = [
  { "_id": "P001", "project_name": "7-11 POC", "project_code": "P001", "status": "ACTIVE", "start_date": "2026-04-01", "billing_type": "Projected" },
  { "_id": "P025", "project_name": "Droisys", "project_code": "P025", "status": "ACTIVE", "start_date": "2026-03-20", "billing_type": "Projected" },
  { "_id": "P029", "project_name": "HSBC (G9)", "project_code": "P029", "status": "PROPOSAL", "start_date": "2026-03-20", "billing_type": "Projected" },
  { "_id": "P011", "project_name": "Oracle Mod Fac (AMP)", "project_code": "P011", "status": "ACTIVE", "billing_type": "Internal" },
  { "_id": "P015", "project_name": "Nitrostack", "project_code": "P015", "status": "ACTIVE", "billing_type": "Internal" },
  { "_id": "P018", "project_name": "APAF", "project_code": "P018", "status": "ACTIVE", "billing_type": "Internal" },
  { "_id": "P042", "project_name": "WeKan HR - AI", "project_code": "P042", "status": "ACTIVE", "billing_type": "Internal" },
  { "_id": "P044", "project_name": "PMF Product", "project_code": "P044", "status": "ACTIVE", "billing_type": "Internal" },
  { "_id": "P002", "project_name": "Agentic POC", "project_code": "P002", "status": "COMPLETED", "billing_type": "Internal" },
  { "_id": "P017", "project_name": "Unified Architecture", "project_code": "P017", "status": "COMPLETED", "billing_type": "Internal" },
  { "_id": "P012", "project_name": "R360", "project_code": "P012", "status": "PROPOSAL", "billing_type": "Internal" },
  { "_id": "P037", "project_name": "Test Automation", "project_code": "P037", "status": "PROPOSAL", "billing_type": "Internal" },
  { "_id": "P004", "project_name": "Allianz", "project_code": "P004", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P005", "project_name": "AWL Gen AI", "project_code": "P005", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P006", "project_name": "Maintenance: AWL/MCP", "project_code": "P006", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P008", "project_name": "Cathay Pacific - HK", "project_code": "P008", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P013", "project_name": "Schlumberger (G9)", "project_code": "P013", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P035", "project_name": "SBI DBA", "project_code": "P035", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P037_2", "project_name": "Stack IT Germany", "project_code": "P037_SIT", "status": "ACTIVE", "billing_type": "Customer" },
  { "_id": "P003", "project_name": "AIA Singapore", "project_code": "P003", "status": "COMPLETED", "billing_type": "Customer" },
  { "_id": "P007", "project_name": "Casapadel Migration", "project_code": "P007", "status": "COMPLETED", "billing_type": "Customer" },
  { "_id": "P014", "project_name": "Stanley Black and Decker", "project_code": "P014", "status": "COMPLETED", "billing_type": "Customer" },
  { "_id": "P020", "project_name": "AWL - CR Development 2025", "project_code": "P020", "status": "COMPLETED", "billing_type": "Customer" },
  { "_id": "P009", "project_name": "Coradine Aviation", "project_code": "P009", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P010", "project_name": "Herbalife - Realm", "project_code": "P010", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P016", "project_name": "Tech Mahindra (AT&T)", "project_code": "P016", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P021", "project_name": "AWS Realm Template", "project_code": "P021", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P023", "project_name": "Disney", "project_code": "P023", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P024", "project_name": "Dr. Reddy's", "project_code": "P024", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P026", "project_name": "Enel (Realm)", "project_code": "P026", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P027", "project_name": "HoneyQuote", "project_code": "P027", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P030", "project_name": "Mango", "project_code": "P030", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P032", "project_name": "Muthoot - GenAI", "project_code": "P032", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P033", "project_name": "Muthoot Finance - Platform", "project_code": "P033", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P036", "project_name": "AIA Singapore - Prod Support", "project_code": "P036", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P038", "project_name": "Vertinetik AI", "project_code": "P038", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P039", "project_name": "Viila", "project_code": "P039", "status": "ON_HOLD", "billing_type": "Customer" },
  { "_id": "P040", "project_name": "Luthien Space Systems", "project_code": "P040", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P041", "project_name": "TKS Security", "project_code": "P041", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P043", "project_name": "AWL eCommerce CR", "project_code": "P043", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P045", "project_name": "My Coaching Place", "project_code": "P045", "status": "PROPOSAL", "billing_type": "Customer" },
  { "_id": "P019", "project_name": "AA", "project_code": "P019", "status": "ON_HOLD", "billing_type": "Customer" },
  { "_id": "P022", "project_name": "Davita", "project_code": "P022", "status": "ON_HOLD", "billing_type": "Customer" },
  { "_id": "P028", "project_name": "HrOne", "project_code": "P028", "status": "ON_HOLD", "billing_type": "Customer" },
  { "_id": "P031", "project_name": "Mitech (Realm Assess)", "project_code": "P031", "status": "ON_HOLD", "billing_type": "Customer" },
  { "_id": "P034", "project_name": "Primefocus", "project_code": "P034", "status": "ON_HOLD", "billing_type": "Customer" },
  { "_id": "P036_2", "project_name": "Secure Payment Solutions", "project_code": "P036_SPS", "status": "ON_HOLD", "billing_type": "Customer" }
];

const ALLOCATIONS = [
    { "Resource": "Abhijit Tivari", "Project": "Nitrostack", "From Date": "9-March", "To Date": "8 Jun", "Total Estimated Hours": 560.0 },
    { "Resource": "Abhishek Kumar", "Project": "Allianz", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Abhishek Pandit", "Project": "Nitrostack", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Anand Shirahatti", "Project": "APAF", "From Date": "5-Jan", "To Date": "16-March", "Total Estimated Hours": 440.0 },
    { "Resource": "Anand Shirahatti", "Project": "Allianz", "From Date": "2-March", "To Date": "29 Jun", "Total Estimated Hours": 624.0 },
    { "Resource": "Anurag Tripathi", "Project": "HoneyQuote", "From Date": "5-Jan", "To Date": "26-Jan", "Total Estimated Hours": 160.0 },
    { "Resource": "Ashwin S", "Project": "AIA Singapore - Prod Support", "From Date": "11 May", "To Date": "18 May", "Total Estimated Hours": 80.0 },
    { "Resource": "Ashwin S", "Project": "Cathay Pacific - HK", "From Date": "5-Jan", "To Date": "6 Jul", "Total Estimated Hours": 312.0 },
    { "Resource": "Ashwin S", "Project": "Droisys", "From Date": "5-Jan", "To Date": "16-Feb", "Total Estimated Hours": 58.0 },
    { "Resource": "Ashwin S", "Project": "Schlumberger (G9)", "From Date": "5-Jan", "To Date": "30-March", "Total Estimated Hours": 152.0 },
    { "Resource": "Ashwini Shekhawat", "Project": "PMF Product", "From Date": "9-March", "To Date": "27 Apr", "Total Estimated Hours": 320.0 },
    { "Resource": "Ashwini Shekhawat", "Project": "Stanley Black and Decker", "From Date": "5-Jan", "To Date": "2-March", "Total Estimated Hours": 360.0 },
    { "Resource": "Babu Reddy", "Project": "APAF", "From Date": "5-Jan", "To Date": "30-March", "Total Estimated Hours": 130.0 },
    { "Resource": "Babu Reddy", "Project": "Droisys", "From Date": "19-Jan", "To Date": "16-Feb", "Total Estimated Hours": 52.0 },
    { "Resource": "Babu Reddy", "Project": "Stanley Black and Decker", "From Date": "5-Jan", "To Date": "2-March", "Total Estimated Hours": 48.0 },
    { "Resource": "Bhavani Devi Yathapu", "Project": "Oracle Mod Fac (AMP)", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Charumathi K", "Project": "Oracle Mod Fac (AMP)", "From Date": "9-Feb", "To Date": "29 Jun", "Total Estimated Hours": 800.0 },
    { "Resource": "Charumathi K", "Project": "WeKan HR - AI", "From Date": "5-Jan", "To Date": "16-Feb", "Total Estimated Hours": 240.0 },
    { "Resource": "Dipanshu Jain", "Project": "Nitrostack", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Geetha B", "Project": "Stanley Black and Decker", "From Date": "5-Jan", "To Date": "2-March", "Total Estimated Hours": 360.0 },
    { "Resource": "Heenakousar M Makandar", "Project": "Nitrostack", "From Date": "2-Feb", "To Date": "23-Feb", "Total Estimated Hours": 80.0 },
    { "Resource": "Heenakousar M Makandar", "Project": "PMF Product", "From Date": "2-Feb", "To Date": "27 Apr", "Total Estimated Hours": 440.0 },
    { "Resource": "Hemant Jadhav", "Project": "Nitrostack", "From Date": "9-March", "To Date": "8 Jun", "Total Estimated Hours": 560.0 },
    { "Resource": "Kavinkumaar P B", "Project": "Allianz", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Lakshmi Prasanna", "Project": "Allianz", "From Date": "2-March", "To Date": "30-March", "Total Estimated Hours": 40.0 },
    { "Resource": "Madhivanan B", "Project": "AIA Singapore - Prod Support", "From Date": "11 May", "To Date": "18 May", "Total Estimated Hours": 80.0 },
    { "Resource": "Madhivanan B", "Project": "Droisys", "From Date": "5-Jan", "To Date": "16-Feb", "Total Estimated Hours": 216.0 },
    { "Resource": "Manish Sharma", "Project": "Nitrostack", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Naga Kartheek Yejandla", "Project": "Allianz", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Nandish Asangi", "Project": "APAF", "From Date": "5-Jan", "To Date": "9-Feb", "Total Estimated Hours": 240.0 },
    { "Resource": "Navarathinam C", "Project": "APAF", "From Date": "5-Jan", "To Date": "23-Feb", "Total Estimated Hours": 320.0 },
    { "Resource": "Navarathinam C", "Project": "AWL eCommerce CR", "From Date": "2-March", "To Date": "23-March", "Total Estimated Hours": 160.0 },
    { "Resource": "Pallav Tripathi", "Project": "Nitrostack", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Prem kumar", "Project": "AWL eCommerce CR", "From Date": "2-Feb", "To Date": "6 Apr", "Total Estimated Hours": 200.0 },
    { "Resource": "Prem kumar", "Project": "Maintenance: AWL/MCP", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 600.0 },
    { "Resource": "Priyanshu Yadav", "Project": "SBI DBA", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Ramachandra Naragund", "Project": "Stanley Black and Decker", "From Date": "5-Jan", "To Date": "2-March", "Total Estimated Hours": 60.0 },
    { "Resource": "Ramachandran A", "Project": "Stanley Black and Decker", "From Date": "5-Jan", "To Date": "2-March", "Total Estimated Hours": 60.0 },
    { "Resource": "Sanjay Verma", "Project": "Allianz", "From Date": "2-March", "To Date": "29 Jun", "Total Estimated Hours": 712.0 },
    { "Resource": "Sanjay Verma", "Project": "Oracle Mod Fac (AMP)", "From Date": "5-Jan", "To Date": "2-March", "Total Estimated Hours": 328.0 },
    { "Resource": "Satnam Singh", "Project": "AWL Gen AI", "From Date": "5-Jan", "To Date": "2-Feb", "Total Estimated Hours": 90.0 },
    { "Resource": "Satnam Singh", "Project": "Oracle Mod Fac (AMP)", "From Date": "12-Jan", "To Date": "26-Jan", "Total Estimated Hours": 80.0 },
    { "Resource": "Satnam Singh", "Project": "PMF Product", "From Date": "2-Feb", "To Date": "27 Apr", "Total Estimated Hours": 510.0 },
    { "Resource": "Sharma S", "Project": "AWL eCommerce CR", "From Date": "2-Feb", "To Date": "6 Apr", "Total Estimated Hours": 200.0 },
    { "Resource": "Sharma S", "Project": "Maintenance: AWL/MCP", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 620.0 },
    { "Resource": "Shashikumar D E", "Project": "Allianz", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 2080.0 },
    { "Resource": "Shivathanu G C", "Project": "Cathay Pacific - HK", "From Date": "12-Jan", "To Date": "6 Jul", "Total Estimated Hours": 840.0 },
    { "Resource": "Shivathanu G C", "Project": "Oracle Mod Fac (AMP)", "From Date": "5-Jan", "To Date": "12-Jan", "Total Estimated Hours": 80.0 },
    { "Resource": "Shrihari Rao", "Project": "APAF", "From Date": "26-Jan", "To Date": "26-Jan", "Total Estimated Hours": 40.0 },
    { "Resource": "Shrihari Rao", "Project": "AWL eCommerce CR", "From Date": "2-Feb", "To Date": "6 Apr", "Total Estimated Hours": 400.0 },
    { "Resource": "Shubham Singh", "Project": "Nitrostack", "From Date": "5-Jan", "To Date": "29 Jun", "Total Estimated Hours": 1040.0 },
    { "Resource": "Subburaj Murugan Reddiyar", "Project": "Schlumberger (G9)", "From Date": "5-Jan", "To Date": "30-March", "Total Estimated Hours": 520.0 },
    { "Resource": "Subburaj Murugan Reddiyar", "Project": "WeKan HR - AI", "From Date": "5-Jan", "To Date": "23-Feb", "Total Estimated Hours": 64.0 },
    { "Resource": "Suresh KK", "Project": "APAF", "From Date": "5-Jan", "To Date": "30-March", "Total Estimated Hours": 520.0 },
    { "Resource": "Tamilarasu Ravi", "Project": "Cathay Pacific - HK", "From Date": "5-Jan", "To Date": "22 Jun", "Total Estimated Hours": 1000.0 },
    { "Resource": "Tanmoy Barash", "Project": "HoneyQuote", "From Date": "5-Jan", "To Date": "26-Jan", "Total Estimated Hours": 160.0 }
];

function parseDate(dateStr: string | null | undefined): Date {
    if (!dateStr) return new Date();
    
    // Handle standard ISO
    if (dateStr.includes('T')) return new Date(dateStr);
    
    // Clean up strings like "9-March", "8 Jun", "Aprint 1st"
    let cleaned = dateStr.toLowerCase()
        .replace('aprint', 'april')
        .replace('jun', 'june')
        .replace('sep', 'september')
        .replace('oct', 'october')
        .replace('nov', 'november')
        .replace('dec', 'december')
        .replace('jan', 'january')
        .replace('feb', 'february')
        .replace('mar', 'march')
        .replace('apr', 'april')
        .replace('may', 'may') // may remains may
        .replace('aug', 'august')
        .trim();

    // If it's just month-day, add year 2026
    const parts = cleaned.split(/[- ]/);
    if (parts.length === 2) {
        // Handle "9-march" or "8 june"
        let day, month;
        if (isNaN(parseInt(parts[0]))) {
            month = parts[0];
            day = parts[1];
        } else {
            day = parts[0];
            month = parts[1];
        }
        return new Date(`${month} ${day}, 2026`);
    }

    const d = new Date(cleaned);
    if (isNaN(d.getTime())) {
        console.warn(`Could not parse date: ${dateStr}, defaulting to now`);
        return new Date();
    }
    return d;
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        // Cleanup
        await Project.deleteMany({});
        await ProjectAllocation.deleteMany({});
        console.log('Cleaned up projects and allocations.');

        const admin = await Employee.findOne({ position: 'Architect' });
        if (!admin) throw new Error('Could not find an admin employee for defaults');

        // Insert Projects
        const projectMap = new Map();
        console.log(`Inserting ${PROJECTS.length} projects...`);
        for (const p of PROJECTS) {
            let status = ProjectStatus.ACTIVE;
            if (p.status === 'COMPLETED') status = ProjectStatus.COMPLETED;
            if (p.status === 'PROPOSAL') status = ProjectStatus.PLANNING;
            if (p.status === 'ON_HOLD' || p.status === 'PROPOSAL LOST') status = ProjectStatus.ON_HOLD;

            let billing = BillingType.BILLABLE;
            if (p.billing_type === 'Internal') billing = BillingType.NON_BILLABLE;

            const inserted = await Project.create({
                project_name: p.project_name,
                project_code: p.project_code,
                project_owner_id: admin._id,
                project_manager_id: admin._id,
                status: status,
                priority: ProjectPriority.MEDIUM,
                start_date: parseDate(p.start_date || '2026-01-01'),
                end_date: new Date(new Date().getFullYear() + 1, 0, 1), // Default 1 year
                billing_type: billing,
            });
            projectMap.set(p.project_name.trim(), inserted._id);
        }

        // Insert Allocations
        console.log(`Mapping ${ALLOCATIONS.length} allocations...`);
        for (const a of ALLOCATIONS) {
            const names = a.Resource.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ');

            const employee = await Employee.findOne({
                first_name: firstName,
                last_name: lastName
            });

            const projectId = projectMap.get(a.Project.trim());

            if (!employee) {
                console.warn(`Employee not found: ${a.Resource}`);
                continue;
            }
            if (!projectId) {
                console.warn(`Project not found: ${a.Project}`);
                continue;
            }

            const startDate = parseDate(a['From Date']);
            const endDate = parseDate(a['To Date']);
            
            // Calc percentage if hours provided
            // Assuming 8 hours a day, 5 days a week for the duration
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            const totalWorkDays = (diffDays / 7) * 5;
            const totalWorkHours = totalWorkDays * 8;
            
            let percent = 100;
            if (a['Total Estimated Hours']) {
                percent = Math.min(100, Math.round((a['Total Estimated Hours'] / totalWorkHours) * 100));
            }

            await ProjectAllocation.create({
                project_id: projectId,
                employee_id: employee._id,
                role_id: employee.role_id || admin.role_id,
                start_date: startDate,
                end_date: endDate,
                allocation_percent: percent,
                type: AllocationType.PERCENTAGE,
                is_active: true,
                created_by_role: CreatedByRole.SYSTEM
            });
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
