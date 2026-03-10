/**
 * Script to create a detailed conflict analysis between MongoDB fields and backend models
 */
const data = require('./db-schema-analysis.json');

console.log('='.repeat(80));
console.log('RESOURCE-360 DATABASE SCHEMA ANALYSIS');
console.log('='.repeat(80));
console.log(`Database: ${data.database}`);
console.log(`Timestamp: ${data.timestamp}\n`);

// Define expected backend model fields for comparison
const backendModels = {
    employees: ['firstName', 'lastName', 'email', 'employeeCode', 'status', 'roleId', 'department', 'designation', 'skills', 'maxAllocationPercent', 'joiningDate', 'exitDate', 'isActive'],
    projects: ['code', 'name', 'status', 'priority', 'ownerId', 'startDate', 'endDate', 'billingType', 'deliveryModel', 'skillRequirements', 'roleEfforts', 'businessGoal', 'staffingStrategy'],
    skills: ['name', 'category', 'description', 'isActive'],
    roles: ['name', 'department', 'description', 'isActive'],
    project_allocations: ['projectId', 'employeeId', 'roleId', 'startDate', 'endDate', 'percentage', 'type', 'isActive', 'allocationReason', 'createdByRole']
};

data.collections.forEach(c => {
    if (c.documentCount === 0) return;

    console.log('\n' + '='.repeat(80));
    console.log(`📦 COLLECTION: ${c.name.toUpperCase()}`);
    console.log(`   Documents: ${c.documentCount}`);
    console.log('='.repeat(80));

    console.log('\n   DB FIELDS (from sample):');
    c.fields.forEach(f => console.log(`      • ${f}`));

    // Compare with backend model if available
    const modelKey = Object.keys(backendModels).find(k =>
        c.name.includes(k) || k.includes(c.name.replace('_', ''))
    );

    if (modelKey) {
        console.log(`\n   BACKEND MODEL FIELDS (${modelKey}):`);
        backendModels[modelKey].forEach(f => console.log(`      • ${f}`));

        // Identify potential conflicts
        const dbFieldsLower = c.fields.map(f => f.toLowerCase().replace(/_/g, ''));
        const modelFieldsLower = backendModels[modelKey].map(f => f.toLowerCase());

        const conflicts = [];
        c.fields.forEach(dbField => {
            const normalized = dbField.toLowerCase().replace(/_/g, '');
            const matchingModelField = backendModels[modelKey].find(mf => mf.toLowerCase() === normalized);
            if (matchingModelField && dbField !== matchingModelField) {
                conflicts.push({ db: dbField, model: matchingModelField });
            }
        });

        if (conflicts.length > 0) {
            console.log('\n   ⚠️  FIELD NAMING CONFLICTS:');
            conflicts.forEach(c => console.log(`      DB: "${c.db}" vs Model: "${c.model}"`));
        }
    }

    console.log('\n   SAMPLE DOCUMENT:');
    console.log(JSON.stringify(c.sampleDocument, null, 4).split('\n').map(l => '   ' + l).join('\n'));
});

console.log('\n\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log('\n Collections with data:');
data.collections.filter(c => c.documentCount > 0).forEach(c => {
    console.log(`   • ${c.name}: ${c.documentCount} documents`);
});
