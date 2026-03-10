
const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/resource-360';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected');
        const skill = await mongoose.connection.db.collection('skills').findOne({});
        console.log('Sample skill:', JSON.stringify(skill, null, 2));

        const countOld = await mongoose.connection.db.collection('skills').countDocuments({ skill_name: { $exists: true } });
        console.log('Documents with skill_name:', countOld);

        const countNew = await mongoose.connection.db.collection('skills').countDocuments({ name: { $exists: true } });
        console.log('Documents with name:', countNew);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

check();
