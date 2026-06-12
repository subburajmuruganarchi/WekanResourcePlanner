/**
 * Planner import orchestration — Excel and Google Sheet sources share import services.
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import {
    PlannerImportOptions,
    PlannerImportResult,
    SheetImportResult,
} from './types/import-result.types';
import { ResourceImportRow } from './types/resource-row.dto';
import { ProjectImportRow } from './types/project-row.dto';
import { AllocationImportRow } from './types/allocation-row.dto';
import {
    excelResourceRowsFromWorksheet,
    excelR360AccessRowsFromWorksheet,
    excelProjectRowsFromWorksheet,
    excelAllocationWeekColumnsFromWorksheet,
    excelAllocationRowsFromWorksheet,
} from './adapters/excel-row.adapter';
import {
    bootstrapImportContext,
    applyR360AccessRows,
    resolvePmFallback,
    importResourceRows,
} from './resource-import.service';
import { importProjectRows } from './project-import.service';
import { importAllocationRows } from './allocation-import.service';
import { cleanupJunkSkills, PASSWORD_PLAIN } from './planner-import.utils';
import { ImportContext } from './types/import-context.types';
import { hydrateContextFromDatabase } from './context-hydration.service';

export type { PlannerImportOptions, PlannerImportResult } from './types/import-result.types';

const DEFAULT_SHEETS_DIR = path.join(__dirname, '../../../data/planner');
const ALLOCATION_SHEET_NAME = 'Project_Allocation';
const DEFAULT_XLSX =
    process.env.PLANNER_XLSX_PATH ||
    'C:/Users/Wekan/Downloads/25.05.25 Copy of WeKan Resource Planner 2026.xlsx';

function persistUploadedFiles(
    sheetsDir: string,
    options: Pick<PlannerImportOptions, 'resourceBuffer' | 'projectBuffer' | 'allocationBuffer'>
): void {
    fs.mkdirSync(sheetsDir, { recursive: true });
    if (options.resourceBuffer) {
        fs.writeFileSync(path.join(sheetsDir, 'Resource.xlsx'), options.resourceBuffer);
    }
    if (options.projectBuffer) {
        fs.writeFileSync(path.join(sheetsDir, 'Project.xlsx'), options.projectBuffer);
    }
    if (options.allocationBuffer) {
        fs.writeFileSync(path.join(sheetsDir, 'Project_Allocation.xlsx'), options.allocationBuffer);
    }
}

async function loadWorksheet(
    sheetName: string,
    options: {
        explicitPath?: string;
        buffer?: Buffer;
        fallbackWorkbook?: ExcelJS.Workbook;
        sheetsDir?: string;
    } = {}
): Promise<ExcelJS.Worksheet> {
    const sheetsDir = options.sheetsDir ?? process.env.PLANNER_SHEETS_DIR ?? DEFAULT_SHEETS_DIR;

    if (options.buffer) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(options.buffer as unknown as ExcelJS.Buffer);
        const worksheet = workbook.getWorksheet(sheetName) || workbook.worksheets[0];
        if (worksheet) {
            console.log(`Loaded "${sheetName}" from uploaded file`);
            return worksheet;
        }
        throw new Error(`Could not find worksheet "${sheetName}" in uploaded file.`);
    }

    const candidates = [
        options.explicitPath,
        path.join(sheetsDir, `${sheetName}.xlsx`),
    ].filter((value): value is string => !!value);

    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) continue;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(sheetName) || workbook.worksheets[0];
        if (worksheet) {
            console.log(`Loaded "${sheetName}" from ${filePath}`);
            return worksheet;
        }
    }

    const fallbackWorksheet = options.fallbackWorkbook?.getWorksheet(sheetName);
    if (fallbackWorksheet) {
        console.log(`Loaded "${sheetName}" from fallback workbook`);
        return fallbackWorksheet;
    }

    throw new Error(
        `Could not load worksheet "${sheetName}". Place ${sheetName}.xlsx in ${sheetsDir} or upload it via Admin Inputs.`
    );
}

async function tryLoadWorksheet(
    sheetName: string,
    options: { fallbackWorkbook?: ExcelJS.Workbook; sheetsDir?: string } = {}
): Promise<ExcelJS.Worksheet | undefined> {
    try {
        return await loadWorksheet(sheetName, options);
    } catch {
        return undefined;
    }
}

function mergeSheetResults(...results: SheetImportResult[]): Pick<
    PlannerImportResult,
    'rowsReceived' | 'rowsProcessed' | 'rowsSkipped' | 'skippedRows' | 'errors'
> {
    const skippedRows = results.flatMap((r) => r.skippedRows);
    const errors = results.flatMap((r) => r.errors);
    return {
        rowsReceived: results.reduce((s, r) => s + r.rowsReceived, 0),
        rowsProcessed: results.reduce((s, r) => s + r.rowsProcessed, 0),
        rowsSkipped: results.reduce((s, r) => s + r.rowsSkipped, 0),
        skippedRows,
        errors,
    };
}

/** Run full or partial import from DTO rows (used by Google Sheet sync and internal orchestration). */
export async function runPlannerSheetImport(params: {
    resourceRows?: ResourceImportRow[];
    projectRows?: ProjectImportRow[];
    allocationRows?: AllocationImportRow[];
    r360AccessRows?: { email: string; roles: string[] }[];
    resourceOnly?: boolean;
    syncId?: string;
    existingContext?: ImportContext;
}): Promise<PlannerImportResult> {
    const resourceOnly = params.resourceOnly ?? false;
    let ctx = params.existingContext ?? (await bootstrapImportContext(params.syncId));

    if (params.r360AccessRows?.length) {
        applyR360AccessRows(ctx, params.r360AccessRows);
        await resolvePmFallback(ctx);
    }

    const sheetResults: SheetImportResult[] = [];
    let employeesUpserted = 0;
    let projectsUpserted = 0;
    let allocationsUpserted = 0;
    let weeklyEntriesUpserted = 0;

    if (params.resourceRows) {
        const resourceResult = await importResourceRows(params.resourceRows, ctx);
        sheetResults.push(resourceResult);
        employeesUpserted = resourceResult.employeesUpserted;
    }

    if (resourceOnly) {
        const merged = mergeSheetResults(...sheetResults);
        return {
            employeesUpserted,
            projectsUpserted: 0,
            allocationsUpserted: 0,
            weeklyEntriesUpserted: 0,
            jobRoles: ctx.jobRoleIds.size,
            skills: ctx.skillCache.size,
            resourceOnly: true,
            message: 'Resource sheet import complete',
            ...merged,
        };
    }

    if (params.projectRows) {
        if (!params.resourceRows) {
            await hydrateContextFromDatabase(ctx);
            await resolvePmFallback(ctx);
        }
        const projectResult = await importProjectRows(params.projectRows, ctx);
        sheetResults.push(projectResult);
        projectsUpserted = projectResult.projectsUpserted;
    }

    if (params.allocationRows) {
        if (!params.resourceRows && !params.projectRows) {
            await hydrateContextFromDatabase(ctx);
        }
        if (ctx.employeeByEmail.size === 0 || ctx.projectByCode.size === 0) {
            throw new Error(
                'Allocation import requires employees and projects in the database. Sync Resource and Project sheets first.'
            );
        }
        const allocResult = await importAllocationRows(params.allocationRows, ctx);
        sheetResults.push(allocResult);
        allocationsUpserted = allocResult.allocationsUpserted;
        weeklyEntriesUpserted = allocResult.weeklyEntriesUpserted;
    }

    await cleanupJunkSkills();

    const merged = mergeSheetResults(...sheetResults);
    return {
        employeesUpserted,
        projectsUpserted,
        allocationsUpserted,
        weeklyEntriesUpserted,
        jobRoles: ctx.jobRoleIds.size,
        skills: ctx.skillCache.size,
        resourceOnly: false,
        message: 'WeKan Planner import complete',
        ...merged,
    };
}

/** Excel-based import — loads worksheets, converts via Excel adapter, delegates to sheet import. */
export async function runPlannerImport(
    options: PlannerImportOptions = {}
): Promise<PlannerImportResult> {
    const resourceOnly = options.resourceOnly ?? false;
    const sheetsDir = options.sheetsDir ?? process.env.PLANNER_SHEETS_DIR ?? DEFAULT_SHEETS_DIR;

    if (options.persistToDisk !== false) {
        persistUploadedFiles(sheetsDir, options);
    }

    const workbookPath =
        options.fallbackWorkbookPath ?? process.env.PLANNER_XLSX_PATH ?? DEFAULT_XLSX;

    let fallbackWorkbook: ExcelJS.Workbook | undefined;
    if (fs.existsSync(workbookPath)) {
        fallbackWorkbook = new ExcelJS.Workbook();
        await fallbackWorkbook.xlsx.readFile(workbookPath);
        console.log(`Fallback workbook available: ${workbookPath}`);
    } else if (!resourceOnly) {
        console.log(`No monolithic workbook at ${workbookPath}; using split sheets in ${sheetsDir}`);
    }

    const resourcePath = process.env.PLANNER_RESOURCE_XLSX || path.join(sheetsDir, 'Resource.xlsx');
    const wsResource = await loadWorksheet('Resource', {
        explicitPath: options.resourceBuffer ? undefined : resourcePath,
        buffer: options.resourceBuffer,
        fallbackWorkbook,
        sheetsDir,
    });

    const resourceRows = excelResourceRowsFromWorksheet(wsResource);

    const wsR360 = await tryLoadWorksheet('r360 data', { fallbackWorkbook, sheetsDir });
    const r360AccessRows = wsR360 ? excelR360AccessRowsFromWorksheet(wsR360) : undefined;

    let projectRows: ProjectImportRow[] | undefined;
    let allocationRows: AllocationImportRow[] | undefined;

    if (!resourceOnly) {
        const projectPath = process.env.PLANNER_PROJECT_XLSX || path.join(sheetsDir, 'Project.xlsx');
        const allocationPath =
            process.env.PLANNER_ALLOCATION_XLSX || path.join(sheetsDir, 'Project_Allocation.xlsx');

        const wsProject = await loadWorksheet('Project', {
            explicitPath: options.projectBuffer ? undefined : projectPath,
            buffer: options.projectBuffer,
            fallbackWorkbook,
            sheetsDir,
        });
        projectRows = excelProjectRowsFromWorksheet(wsProject);

        const wsAlloc = await loadWorksheet(ALLOCATION_SHEET_NAME, {
            explicitPath: options.allocationBuffer ? undefined : allocationPath,
            buffer: options.allocationBuffer,
            fallbackWorkbook,
            sheetsDir,
        });
        const weekColumns = excelAllocationWeekColumnsFromWorksheet(wsAlloc);
        allocationRows = excelAllocationRowsFromWorksheet(wsAlloc, weekColumns);
    }

    const result = await runPlannerSheetImport({
        resourceRows,
        projectRows,
        allocationRows,
        r360AccessRows,
        resourceOnly,
        syncId: options.syncId,
    });

    if (resourceOnly) {
        console.log('\n--- Resource sheet seed complete ---');
        console.log(`Employees upserted: ${result.employeesUpserted}`);
        console.log(`Job roles: ${result.jobRoles}, Skills: ${result.skills}`);
        console.log(`Login password for all seeded users: ${PASSWORD_PLAIN}`);
    } else {
        console.log('\n--- WeKan Planner seed complete ---');
        console.log(`Employees upserted: ${result.employeesUpserted}`);
        console.log(`Projects upserted: ${result.projectsUpserted}`);
        console.log(`Allocations upserted: ${result.allocationsUpserted}`);
        console.log(`Weekly grid cells upserted: ${result.weeklyEntriesUpserted}`);
        console.log(`Login password for all seeded users: ${PASSWORD_PLAIN}`);
    }

    return result;
}
