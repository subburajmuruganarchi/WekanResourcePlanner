
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixSkills = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('skills');

        const result = await collection.updateMany(
            { skill_name: { $exists: true } },
            { $rename: { "skill_name": "name", "skill_category": "category" } }
        );

        console.log(`Matched ${result.matchedCount} documents.`);
        console.log(`Modified ${result.modifiedCount} documents.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

fixSkills();
