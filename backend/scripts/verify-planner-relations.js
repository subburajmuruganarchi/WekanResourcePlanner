/**
 * Verify role / skill / employee / project relationships after planner seed.
 * Usage: node scripts/verify-planner-relations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const employees = await db.collection('employees').countDocuments({ employee_code: { $regex: /^E\d+/i } });
  const missingJobRole = await db.collection('employees').countDocuments({
    employee_code: { $regex: /^E\d+/i },
    $or: [{ job_role_id: { $exists: false } }, { job_role_id: null }],
  });
  const missingAccessRole = await db.collection('employees').countDocuments({
    employee_code: { $regex: /^E\d+/i },
    $or: [{ role_id: { $exists: false } }, { role_id: null }],
  });

  const empSkills = await db.collection('employee_skills').countDocuments();
  const orphanEmpSkills = await db.collection('employee_skills').aggregate([
    {
      $lookup: {
        from: 'employees',
        localField: 'employee_id',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $match: { emp: { $size: 0 } } },
    { $count: 'n' },
  ]).toArray();

  const allocOrphans = await db.collection('project_allocations').aggregate([
    {
      $lookup: {
        from: 'employees',
        localField: 'employee_id',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $match: { emp: { $size: 0 } } },
    { $count: 'n' },
  ]).toArray();

  const allocRoleMismatch = await db.collection('project_allocations').aggregate([
    {
      $lookup: {
        from: 'employees',
        localField: 'employee_id',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $unwind: '$emp' },
    {
      $lookup: {
        from: 'roles',
        localField: 'role_id',
        foreignField: '_id',
        as: 'allocRole',
      },
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'emp.job_role_id',
        foreignField: '_id',
        as: 'jobRole',
      },
    },
    {
      $project: {
        allocRole: { $arrayElemAt: ['$allocRole.role_name', 0] },
        jobRole: { $arrayElemAt: ['$jobRole.role_name', 0] },
        position: '$emp.position',
      },
    },
    { $match: { $expr: { $ne: ['$allocRole', '$jobRole'] } } },
    { $limit: 10 },
  ]).toArray();

  const sampleByRole = await db.collection('employees').aggregate([
    { $match: { employee_code: { $regex: /^E\d+/i } } },
    {
      $lookup: {
        from: 'roles',
        localField: 'job_role_id',
        foreignField: '_id',
        as: 'jobRole',
      },
    },
    {
      $lookup: {
        from: 'employee_skills',
        localField: '_id',
        foreignField: 'employee_id',
        as: 'es',
      },
    },
    { $unwind: { path: '$jobRole', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$jobRole.role_name',
        count: { $sum: 1 },
        avgExp: { $avg: { $arrayElemAt: ['$es.experience_years', 0] } },
        levels: { $addToSet: { $arrayElemAt: ['$es.skill_level', 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]).toArray();

  const projSkillWithRole = await db.collection('project_skill_requirements').aggregate([
    {
      $lookup: {
        from: 'roles',
        localField: 'role_id',
        foreignField: '_id',
        as: 'role',
      },
    },
    {
      $lookup: {
        from: 'skills',
        localField: 'skill_id',
        foreignField: '_id',
        as: 'skill',
      },
    },
    { $limit: 5 },
    {
      $project: {
        project_id: 1,
        role: { $arrayElemAt: ['$role.role_name', 0] },
        skill: { $arrayElemAt: ['$skill.name', 0] },
        min_skill_level: 1,
      },
    },
  ]).toArray();

  console.log('=== Planner relationship audit ===\n');
  console.log('Seeded employees:', employees);
  console.log('Missing job_role_id:', missingJobRole);
  console.log('Missing access role_id:', missingAccessRole);
  console.log('employee_skills rows:', empSkills);
  console.log('Orphan employee_skills:', orphanEmpSkills[0]?.n ?? 0);
  console.log('Orphan allocations (no employee):', allocOrphans[0]?.n ?? 0);
  console.log('\nAllocations where alloc role != employee job role (sample):');
  allocRoleMismatch.forEach((r) =>
    console.log(`  alloc=${r.allocRole} | employee job=${r.jobRole} | position=${r.position}`)
  );
  console.log('\nExperience by job role (from employee_skills):');
  sampleByRole.forEach((r) =>
    console.log(`  ${r._id || '(none)'}: ${r.count} people, ~${Math.round(r.avgExp || 0)} yrs, levels=${(r.levels || []).join('/')}`)
  );
  console.log('\nSample project_skill_requirements:');
  projSkillWithRole.forEach((r) =>
    console.log(`  skill=${r.skill} | required role=${r.role} | min level=${r.min_skill_level}`)
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
