
const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://localhost:27017/resource-360';

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected');
        const collection = mongoose.connection.db.collection('skills');

        const skills = await collection.find({ skill_name: { $exists: true } }).toArray();
        console.log(`Found ${skills.length} skills to migrating...`);

        for (const s of skills) {
            console.log(`Migrating skill: ${s.skill_name}`);
            await collection.updateOne(
                { _id: s._id },
                {
                    $set: {
                        name: s.skill_name,
                        category: s.skill_category || 'General'
                    },
                    $unset: {
                        skill_name: "",
                        skill_category: ""
                    }
                }
            );
        }

        console.log('Migration complete.');

        const sample = await collection.findOne({});
        console.log('Sample after migration:', JSON.stringify(sample, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

migrate();
