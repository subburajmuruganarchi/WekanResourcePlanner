
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Employee } from '../modules/employees/employee.model';
import { Role } from '../modules/roles/role.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const userUpdates = [
    { name: 'Babu Reddy', email: 'babur@wekancode.com' },
    { name: 'Ashwin S', email: 'ashwins@wekancode.com' },
    { name: 'Abhishek Kumar', email: 'abhishekk@wekancode.com' },
    { name: 'Abhishek Pandit', email: 'abhishekp@wekancode.com' },
    { name: 'Satnam Singh', email: 'satnams@wekancode.com' },
    { name: 'Navarathinam C', email: 'navarathinamc@wekancode.com' },
    { name: 'Shivathanu G C', email: 'shivathanug@wekancode.com' },
    { name: 'Ashwini Shekhawat', email: 'ashwinis@wekancode.com' },
    { name: 'Tarun Teja', email: 'tarunt@wekancode.com' },
    { name: 'Kavinkumaar P B', email: 'kavink@wekancode.com' },
    { name: 'Shubham Singh', email: 'shubhamsingh@wekancode.com' },
    { name: 'Naga Kartheek Yejandla', email: 'nagakartheek@wekancode.com' },
    { name: 'Sharma S', email: 'sharmas@wekancode.com' },
    { name: 'Anand Shirahatti', email: 'anands@wekancode.com' },
    { name: 'Sanjay Verma', email: 'sanjayv@wekancode.com' },
    { name: 'Geetha B', email: 'geethab@wekancode.com' },
    { name: 'Bhavani Devi Yathapu', email: 'bhavanid@wekan.company' },
    { name: 'Pallav Tripathi', email: 'pallavt@wekancode.com' },
    { name: 'Anurag Tripathi', email: 'anuragt@wekancode.com' },
    { name: 'Tanmoy Barash', email: 'tanmoyb@wekan.company' },
];

async function updateUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('Connected to MongoDB');

        // 1. Ensure "Product Manager" role exists
        let pmRole = await Role.findOne({ role_name: 'Product Manager' });
        if (!pmRole) {
            pmRole = await Role.create({
                role_name: 'Product Manager',
                department: 'Product Management',
                is_active: true
            });
            console.log('Created "Product Manager" role');
        }

        // 2. Update existing users
        for (const update of userUpdates) {
            const [firstName, ...lastNameParts] = update.name.split(' ');
            const lastName = lastNameParts.join(' ');

            const employee = await Employee.findOne({
                first_name: new RegExp(`^${firstName}$`, 'i'),
                last_name: new RegExp(`^${lastName}$`, 'i')
            });

            if (employee) {
                employee.email = update.email;
                await employee.save();
                console.log(`Updated email for ${update.name} to ${update.email}`);
            } else {
                console.warn(`Employee not found: ${update.name}`);
            }
        }

        // 3. Create "Kevin Jose"
        const kevinEmail = 'kevinj@wekancode.com';
        let kevin = await Employee.findOne({ email: kevinEmail });
        if (!kevin) {
            kevin = await Employee.create({
                first_name: 'Kevin',
                last_name: 'Jose',
                email: kevinEmail,
                status: 'Active',
                role_id: pmRole._id,
                department: 'Product Management',
                position: 'Product Manager',
                is_active: true
            });
            console.log('Created user: Kevin Jose');
        } else {
            console.log('User Kevin Jose already exists');
        }

        console.log('User updates completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating users:', error);
        process.exit(1);
    }
}

updateUsers();
