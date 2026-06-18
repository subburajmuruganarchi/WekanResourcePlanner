/**
 * Ensure production indexes for Google Sheet sync collections.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." node backend/scripts/migrate-sync-indexes.js
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

async function ensureIndex(col, keys, options, label) {
    const indexes = await col.indexes();
    const exists = indexes.some(
        (idx) =>
            JSON.stringify(idx.key) === JSON.stringify(keys) &&
            (!options.unique || idx.unique === true)
    );
    if (exists) {
        console.log(`Index already exists: ${label}`);
        return;
    }
    await col.createIndex(keys, options);
    console.log(`Created index: ${label}`);
}

async function main() {
    if (!MONGO_URI) {
        console.error('Set MONGO_URI or DATABASE_URL');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    await ensureIndex(
        db.collection('sync_runs'),
        { syncBatchId: 1, sheet: 1 },
        {
            unique: true,
            partialFilterExpression: { syncBatchId: { $exists: true, $type: 'string' } },
            name: 'syncBatchId_1_sheet_1_unique',
        },
        'sync_runs (syncBatchId, sheet) unique partial'
    );

    await ensureIndex(
        db.collection('sync_batches'),
        { batchId: 1 },
        { unique: true, name: 'batchId_1_unique' },
        'sync_batches batchId unique'
    );

    await ensureIndex(
        db.collection('employees'),
        { email: 1 },
        { unique: true, name: 'email_1_unique' },
        'employees email unique'
    );

    await ensureIndex(
        db.collection('projects'),
        { project_code: 1 },
        { unique: true, name: 'project_code_1_unique' },
        'projects project_code unique'
    );

    await ensureIndex(
        db.collection('sync_locks'),
        { name: 1 },
        { unique: true, name: 'sync_lock_name_unique' },
        'sync_locks name unique'
    );

    await mongoose.disconnect();
    console.log('Done');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
