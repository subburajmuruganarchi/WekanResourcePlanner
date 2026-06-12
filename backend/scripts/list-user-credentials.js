require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const PASSWORD = 'Admin123!';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const users = await db
    .collection('employees')
    .aggregate([
      {
        $lookup: {
          from: 'roles',
          localField: 'role_id',
          foreignField: '_id',
          as: 'accessRole',
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'job_role_id',
          foreignField: '_id',
          as: 'jobRole',
        },
      },
      {
        $project: {
          email: 1,
          first_name: 1,
          last_name: 1,
          employee_code: 1,
          status: 1,
          accessRole: { $arrayElemAt: ['$accessRole.role_name', 0] },
          jobRole: { $arrayElemAt: ['$jobRole.role_name', 0] },
        },
      },
      { $sort: { accessRole: 1, last_name: 1, first_name: 1 } },
    ])
    .toArray();

  const byRole = {};
  for (const u of users) {
    const role = u.accessRole || 'Unknown';
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(u);
  }

  console.log(`Default password for all seeded accounts: ${PASSWORD}\n`);
  console.log(`Total users: ${users.length}\n`);

  for (const role of Object.keys(byRole).sort()) {
    console.log(`=== ${role} (${byRole[role].length}) ===`);
    for (const u of byRole[role]) {
      console.log(
        `${u.email} | ${u.first_name} ${u.last_name} | ${u.employee_code || '-'} | ${u.jobRole || '-'} | ${u.status}`
      );
    }
    console.log('');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
