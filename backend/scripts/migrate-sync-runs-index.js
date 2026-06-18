/**
 * Dedupe sync_runs and create unique (syncBatchId, sheet) index.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." node backend/scripts/migrate-sync-runs-index.js
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

async function main() {
    if (!MONGO_URI) {
        console.error('Set MONGO_URI or DATABASE_URL');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const col = db.collection('sync_runs');

    const dupes = await col
        .aggregate([
            { $match: { syncBatchId: { $exists: true, $type: 'string' } } },
            {
                $group: {
                    _id: { syncBatchId: '$syncBatchId', sheet: '$sheet' },
                    ids: { $push: { id: '$_id', status: '$status', startedAt: '$startedAt' } },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gt: 1 } } },
        ])
        .toArray();

    console.log(`Found ${dupes.length} duplicate (syncBatchId, sheet) groups`);

    for (const group of dupes) {
        const sorted = group.ids.sort((a, b) => {
            const rank = (s) => (s === 'SUCCESS' ? 0 : s === 'RUNNING' ? 1 : 2);
            const byStatus = rank(a.status) - rank(b.status);
            if (byStatus !== 0) return byStatus;
            return new Date(b.startedAt) - new Date(a.startedAt);
        });
        const keep = sorted[0].id;
        const remove = sorted.slice(1).map((x) => x.id);
        const result = await col.deleteMany({ _id: { $in: remove } });
        console.log(
            `Kept ${keep} for batch=${group._id.syncBatchId} sheet=${group._id.sheet}, removed ${result.deletedCount}`
        );
    }

  const indexes = await col.indexes();
  const hasUnique = indexes.some(
    (idx) =>
      idx.key?.syncBatchId === 1 &&
      idx.key?.sheet === 1 &&
      idx.unique === true
  );

  if (!hasUnique) {
    await col.createIndex(
      { syncBatchId: 1, sheet: 1 },
      {
        unique: true,
        partialFilterExpression: { syncBatchId: { $exists: true, $type: 'string' } },
        name: 'syncBatchId_1_sheet_1_unique',
      }
    );
    console.log('Created unique index syncBatchId_1_sheet_1_unique');
  } else {
    console.log('Unique index already exists');
  }

    await mongoose.disconnect();
    console.log('Done');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
