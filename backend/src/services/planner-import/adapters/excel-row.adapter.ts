import ExcelJS from 'exceljs';
import { ResourceImportRow, R360AccessImportRow } from '../types/resource-row.dto';
import { ProjectImportRow } from '../types/project-row.dto';
import { AllocationImportRow, AllocationWeekHour } from '../types/allocation-row.dto';
import {
    cellText,
    cellNumber,
    parseSheetDate,
    parseSkillList,
    parseWeekMonday,
} from '../planner-import.utils';

export function excelResourceRowsFromWorksheet(ws: ExcelJS.Worksheet): ResourceImportRow[] {
    const rows: ResourceImportRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        rows.push({
            employeeCode: cellText(row.getCell(1)),
            name: cellText(row.getCell(2)),
            jobRole: cellText(row.getCell(3)),
            resourceType: cellText(row.getCell(4)),
            availability: cellText(row.getCell(5)),
            email: cellText(row.getCell(6)).toLowerCase(),
            location: cellText(row.getCell(8)),
            skills: parseSkillList(cellText(row.getCell(9))),
        });
    }
    return rows;
}

export function excelR360AccessRowsFromWorksheet(ws: ExcelJS.Worksheet): R360AccessImportRow[] {
    const hdr = ws.getRow(1);
    const colMap: Record<string, number> = {};
    hdr.eachCell((cell, col) => {
        colMap[cellText(cell).toLowerCase()] = col;
    });
    const colEmail = colMap.email ?? 7;
    const colRole0 = colMap['role[0]'] ?? 8;
    const colRole1 = colMap['role[1]'] ?? 9;

    const rows: R360AccessImportRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const email = cellText(row.getCell(colEmail)).toLowerCase();
        if (!email.includes('@')) continue;
        rows.push({
            email,
            roles: [
                cellText(row.getCell(colRole0)).toLowerCase(),
                cellText(row.getCell(colRole1)).toLowerCase(),
            ],
        });
    }
    return rows;
}

export function excelProjectRowsFromWorksheet(ws: ExcelJS.Worksheet): ProjectImportRow[] {
    const rows: ProjectImportRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const durationRaw = cellText(row.getCell(8));
        const durationWeeks = Number(durationRaw);
        rows.push({
            pid: cellText(row.getCell(1)),
            name: cellText(row.getCell(2)),
            type: cellText(row.getCell(3)),
            statusRaw: cellText(row.getCell(4)) || cellText(row.getCell(15)),
            confirmedStart: parseSheetDate(row.getCell(5)),
            estimatedStart: parseSheetDate(row.getCell(7)),
            durationWeeks: Number.isFinite(durationWeeks) ? durationWeeks : 0,
            architect: cellText(row.getCell(9)),
            beRequired: cellNumber(row.getCell(10)),
            mobileRequired: cellNumber(row.getCell(11)),
            feRequired: cellNumber(row.getCell(12)),
            qaRequired: cellNumber(row.getCell(13)),
            tech: cellText(row.getCell(14)),
        });
    }
    return rows;
}

export interface AllocationWeekColumn {
    col: number;
    monday: Date;
}

export function excelAllocationWeekColumnsFromWorksheet(ws: ExcelJS.Worksheet): AllocationWeekColumn[] {
    const allocHdr = ws.getRow(1);
    const weekColumns: AllocationWeekColumn[] = [];
    allocHdr.eachCell((cell, col) => {
        if (col < 10) return;
        const label = cellText(cell);
        const monday = parseWeekMonday(label);
        if (monday) weekColumns.push({ col, monday });
    });
    weekColumns.sort((a, b) => a.monday.getTime() - b.monday.getTime());
    return weekColumns;
}

export function excelAllocationRowsFromWorksheet(
    ws: ExcelJS.Worksheet,
    weekColumns: AllocationWeekColumn[]
): AllocationImportRow[] {
    const rows: AllocationImportRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const weeklyHours: AllocationWeekHour[] = [];
        for (const w of weekColumns) {
            const hours = cellNumber(row.getCell(w.col));
            if (hours > 0) weeklyHours.push({ weekStart: w.monday, hours });
        }
        rows.push({
            pid: cellText(row.getCell(1)).toUpperCase(),
            projectName: cellText(row.getCell(2)),
            projectType: cellText(row.getCell(3)),
            projectStatus: cellText(row.getCell(4)),
            employeeCode: cellText(row.getCell(5)).toUpperCase(),
            resourceName: cellText(row.getCell(6)),
            jobRole: cellText(row.getCell(7)),
            resourceType: cellText(row.getCell(8)),
            activeFlag: cellText(row.getCell(9)),
            weeklyHours,
        });
    }
    return rows;
}
