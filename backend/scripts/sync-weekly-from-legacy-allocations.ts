/**
 * One-way materialization: active project_allocations → weekly_allocation_entries.
 * Does NOT modify legacy allocations (backward compatible).
 *
 * Usage:
 *   FEATURE_WEEKLY_ALLOCATIONS_ENABLED=true npx ts-node scripts/sync-weekly-from-legacy-allocations.ts
 *   npx ts-node scripts/sync-weekly-from-legacy-allocations.ts --weeks=26
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ProjectAllocation } from '../src/modules/allocations/allocation.model';
import { weeklyAllocationSyncService } from '../src/modules/weekly-allocations/weekly-allocation-sync.service';
import { startOfUtcWeek, endOfUtcWeek } from '../src/common/utils/week.util';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main(): Promise<void> {
    const uri = process.env.MONGO_URI?.trim() || process.env.DATABASE_URL?.trim();
    if (!uri) throw new Error('MONGO_URI required');

    const weeksAhead = parseInt(process.argv.find((a) => a.startsWith('--weeks='))?.split('=')[1] || '12', 10);
    const rangeStart = startOfUtcWeek(new Date());
    const rangeEnd = endOfUtcWeek(new Date());
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + weeksAhead * 7);

    await mongoose.connect(uri);

    const allocations = await ProjectAllocation.find({ is_active: true }).select('_id').lean();
    let total = 0;

    for (const alloc of allocations) {
        const n = await weeklyAllocationSyncService.materializeFromProjectAllocation(
            alloc._id.toString(),
            rangeStart,
            rangeEnd
        );
        total += n;
    }

    console.log(`Materialized ${total} weekly cells from ${allocations.length} legacy allocations.`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
