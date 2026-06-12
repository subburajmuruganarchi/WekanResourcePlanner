/**
 * Script to analyze MongoDB resource_360 database structure
 * Outputs to JSON file for analysis
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || '';

interface CollectionAnalysis {
    name: string;
    documentCount: number;
    fields: string[];
    sampleDocument: Record<string, unknown> | null;
}

interface AnalysisResult {
    database: string;
    collections: CollectionAnalysis[];
    timestamp: string;
}

async function main() {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const collections = await db!.listCollections().toArray();

    const result: AnalysisResult = {
        database: 'resource_360',
        collections: [],
        timestamp: new Date().toISOString()
    };

    for (const col of collections) {
        const collection = db!.collection(col.name);
        const count = await collection.countDocuments();
        const sample = count > 0 ? await collection.findOne({}) : null;
        const fields = sample ? Object.keys(sample) : [];

        result.collections.push({
            name: col.name,
            documentCount: count,
            fields: fields,
            sampleDocument: sample as Record<string, unknown> | null
        });

        console.log(`Analyzed: ${col.name} (${count} docs)`);
    }

    // Write to file
    const outputPath = path.resolve(__dirname, '../db-schema-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nOutput written to: ${outputPath}`);

    await mongoose.connection.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
