require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const emp = await db.collection('employees').findOne({ email: 'abhishekk@wekancode.com' });
  const skills = await db
    .collection('employee_skills')
    .aggregate([
      { $match: { employee_id: emp._id } },
      { $lookup: { from: 'skills', localField: 'skill_id', foreignField: '_id', as: 'skill' } },
      { $limit: 8 },
    ])
    .toArray();
  console.log('Employee:', emp?.first_name, emp?.last_name, '| dept:', emp?.department);
  console.log(
    'Skills in DB:',
    skills.map((s) => ({
      name: s.skill[0]?.name,
      level: s.skill_level,
      years: s.experience_years,
      primary: s.is_primary,
    }))
  );
  console.log('weekly_allocation_entries:', await db.collection('weekly_allocation_entries').countDocuments());
  console.log('project_skill_requirements:', await db.collection('project_skill_requirements').countDocuments());
  console.log('project_role_efforts:', await db.collection('project_role_efforts').countDocuments());
  await mongoose.disconnect();
})();
