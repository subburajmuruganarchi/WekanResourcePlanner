require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const ExcelJS = require('exceljs');

(async () => {
    const { excelAllocationRowsFromWorksheet, excelAllocationWeekColumnsFromWorksheet } = require(
        path.join(__dirname, '../dist/services/planner-import/adapters/excel-row.adapter')
    );
    const { applyProjectStatusFromAllocationRows } = require(
        path.join(__dirname, '../dist/services/planner-import/project-import.service')
    );

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(__dirname, '../data/planner/Project_Allocation.xlsx'));
    const ws = wb.worksheets[0];
    const weekCols = excelAllocationWeekColumnsFromWorksheet(ws);
    const rows = excelAllocationRowsFromWorksheet(ws, weekCols);

    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);

    const updated = await applyProjectStatusFromAllocationRows(rows);
    console.log('Updated projects:', updated);

    const active = await mongoose.connection.db
        .collection('projects')
        .countDocuments({ status: 'Active' });
    console.log('Active after repair:', active);

    await mongoose.disconnect();
})();
