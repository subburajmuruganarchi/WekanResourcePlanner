import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
    await mongoose.connect(process.env.MONGO_URI as string);
    const db = mongoose.connection.db!;
    const col = db.collection('timeentries');

    // Find all entries grouped by employee + date + project
    const entries = await col.find({}).sort({ createdAt: 1 }).toArray();

    const seen = new Map<string, boolean>();
    const duplicateIds: mongoose.Types.ObjectId[] = [];

    for (const entry of entries) {
        const key = `${entry.employeeId}_${entry.date}_${entry.projectId}`;
        if (seen.has(key)) {
            duplicateIds.push(entry._id as mongoose.Types.ObjectId);
        } else {
            seen.set(key, true);
        }
    }

    console.log(`Found ${duplicateIds.length} duplicate entries`);

    if (duplicateIds.length > 0) {
        const result = await col.deleteMany({ _id: { $in: duplicateIds } });
        console.log(`Removed ${result.deletedCount} duplicates`);
    }

    // Show remaining entries
    const remaining = await col.find({}).toArray();
    console.log(`Remaining entries: ${remaining.length}`);
    for (const e of remaining) {
        console.log(`  ${e.date} - ${e.hours}h`);
    }

    process.exit();
}
main();
