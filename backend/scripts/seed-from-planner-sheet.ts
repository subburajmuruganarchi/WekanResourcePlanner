/**
 * CLI wrapper for WeKan Resource Planner seed import.
 *
 * Usage:
 *   npm run seed:planner          # all sheets
 *   npm run seed:resource         # Resource.xlsx only
 *   PLANNER_RESOURCE_XLSX="C:/path/Resource.xlsx" npm run seed:resource
 *   PLANNER_XLSX_PATH="C:/path/to/full-workbook.xlsx" npm run seed:planner
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { runPlannerImport } from '../src/services/planner-import/planner-import.service';

dotenv.config({ path: path.join(__dirname, '../.env') });

function resolveMongoUri(): string {
    const uri = process.env.MONGO_URI?.trim() || process.env.DATABASE_URL?.trim();
    if (!uri) throw new Error('MONGO_URI or DATABASE_URL is required in backend/.env');
    return uri;
}

async function main(): Promise<void> {
    const resourceOnly = process.argv.includes('--resource-only');
    const cliWorkbookPath = process.argv.find(
        (arg) => !arg.startsWith('-') && arg.endsWith('.xlsx')
    );

    await mongoose.connect(resolveMongoUri());
    try {
        const result = await runPlannerImport({
            resourceOnly,
            fallbackWorkbookPath: cliWorkbookPath,
            persistToDisk: false,
        });
        console.log(result.message);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
