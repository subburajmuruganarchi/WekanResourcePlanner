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
    prepareResourceImportReferences,
} from './resource-import.service';
import { importProjectRows, prepareProjectImportReferences, applyProjectStatusFromAllocationRows } from './project-import.service';
import { importAllocationRows, prepareAllocationImportReferences } from './allocation-import.service';
import { cleanupJunkSkills, PASSWORD_PLAIN } from './planner-import.utils';
import { ImportContext } from './types/import-context.types';
import { ImportWriteOptions } from './types/import-write.options';
import { hydrateContextFromDatabase } from './context-hydration.service';
import { startSession, ClientSession } from 'mongoose';
import { structuredLogger } from '../../common/logger';
import { unwrapImportError, toError } from './import-error.utils';
import { inferImportSheet, runPostTransactionCleanup } from './import-post-cleanup';
import { assertResourceRowsValid } from './resource-row.validation';

/** MongoDB multi-doc transaction limits — bulk imports need extended commit window. */
const TRANSACTION_OPTIONS = {
    maxCommitTimeMS: 300_000,
    readConcern: { level: 'local' as const },
    writeConcern: { w: 'majority' as const },
};

const LONG_TRANSACTION_WARN_MS = 45_000;

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
    syncBatchId?: string;
    existingContext?: ImportContext;
    /** Google Sheet webhook: all writes commit or roll back together. */
    atomic?: boolean;
}): Promise<PlannerImportResult> {
    const atomic = params.atomic ?? !!params.syncId;
    if (!atomic) {
        return executePlannerSheetImport(params);
    }

    if (params.resourceRows?.length) {
        assertResourceRowsValid(params.resourceRows);
    }

    const sheet = inferImportSheet(params);
    const txnStartedAt = Date.now();

    const preTxnWriteOpts: ImportWriteOptions = { atomic: true };
    let preCtx =
        params.existingContext ?? (await bootstrapImportContext(params.syncId, preTxnWriteOpts));
    if (params.syncBatchId) {
        preCtx.syncBatchId = params.syncBatchId;
    }
    if (params.r360AccessRows?.length) {
        applyR360AccessRows(preCtx, params.r360AccessRows);
        await resolvePmFallback(preCtx, preTxnWriteOpts);
    }

    if (params.resourceRows?.length) {
        await prepareResourceImportReferences(params.resourceRows, preCtx);
    }
    if (params.projectRows?.length) {
        if (!params.resourceRows?.length) {
            await hydrateContextFromDatabase(preCtx, undefined);
            await resolvePmFallback(preCtx, undefined);
        }
        await prepareProjectImportReferences(params.projectRows, preCtx);
    }
    if (params.allocationRows?.length && !params.resourceRows?.length && !params.projectRows?.length) {
        await hydrateContextFromDatabase(preCtx, undefined);
        await prepareAllocationImportReferences(params.allocationRows, preCtx);
    }

    structuredLogger.info('TRANSACTION_STARTED', {
        event: 'TRANSACTION_STARTED',
        sheet,
        syncBatchId: params.syncBatchId,
        syncId: params.syncId,
    });

    const session = await startSession();
    try {
        let result!: PlannerImportResult;
        await session.withTransaction(async () => {
            result = await executePlannerSheetImport({
                ...params,
                existingContext: preCtx,
                atomic: true,
                session,
                deferStaleCleanup: true,
                deferJunkSkillCleanup: true,
            });
        }, TRANSACTION_OPTIONS);

        const durationMs = Date.now() - txnStartedAt;
        if (durationMs > LONG_TRANSACTION_WARN_MS) {
            structuredLogger.warn('LONG_TRANSACTION_WARNING', {
                event: 'LONG_TRANSACTION_WARNING',
                sheet,
                syncBatchId: params.syncBatchId,
                durationMs,
            });
        }

        structuredLogger.info('TRANSACTION_COMMITTED', {
            event: 'TRANSACTION_COMMITTED',
            sheet,
            syncBatchId: params.syncBatchId,
            durationMs,
        });

        await runPostTransactionCleanup({
            sheet,
            syncId: params.syncId,
            syncBatchId: params.syncBatchId,
            resourceOnly: params.resourceOnly,
        });

        return result;
    } catch (err) {
        const durationMs = Date.now() - txnStartedAt;
        const unwrapped = unwrapImportError(err);
        structuredLogger.error('TRANSACTION_ROLLED_BACK', {
            event: 'TRANSACTION_ROLLED_BACK',
            sheet,
            syncBatchId: params.syncBatchId,
            syncId: params.syncId,
            durationMs,
            error: unwrapped.message,
            code: unwrapped.code,
            codeName: unwrapped.codeName,
            stack: unwrapped.stack,
        });
        structuredLogger.error('PLANNER_IMPORT_TRANSACTION_FAILED', {
            syncBatchId: params.syncBatchId,
            syncId: params.syncId,
            sheet,
            message: unwrapped.message,
            code: unwrapped.code,
            codeName: unwrapped.codeName,
            stack: unwrapped.stack,
        });
        throw toError(unwrapped);
    } finally {
        await session.endSession();
    }
}

async function executePlannerSheetImport(params: {
    resourceRows?: ResourceImportRow[];
    projectRows?: ProjectImportRow[];
    allocationRows?: AllocationImportRow[];
    r360AccessRows?: { email: string; roles: string[] }[];
    resourceOnly?: boolean;
    syncId?: string;
    syncBatchId?: string;
    existingContext?: ImportContext;
    atomic?: boolean;
    session?: ClientSession;
    deferStaleCleanup?: boolean;
    deferJunkSkillCleanup?: boolean;
}): Promise<PlannerImportResult> {
    const writeOpts = {
        session: params.session,
        atomic: params.atomic,
        deferStaleCleanup: params.deferStaleCleanup,
        deferJunkSkillCleanup: params.deferJunkSkillCleanup,
    };
    const resourceOnly = params.resourceOnly ?? false;
    let ctx =
        params.existingContext ?? (await bootstrapImportContext(params.syncId, writeOpts));
    if (params.syncBatchId) {
        ctx.syncBatchId = params.syncBatchId;
    }

    if (params.r360AccessRows?.length) {
        applyR360AccessRows(ctx, params.r360AccessRows);
        await resolvePmFallback(ctx, writeOpts);
    }

    const sheetResults: SheetImportResult[] = [];
    let employeesUpserted = 0;
    let projectsUpserted = 0;
    let allocationsUpserted = 0;
    let weeklyEntriesUpserted = 0;

    if (params.resourceRows) {
        const resourceResult = await importResourceRows(params.resourceRows, ctx, writeOpts);
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
            if (!params.session) {
                await hydrateContextFromDatabase(ctx, undefined);
                await resolvePmFallback(ctx, undefined);
            }
        }
        const projectResult = await importProjectRows(params.projectRows, ctx, writeOpts);
        sheetResults.push(projectResult);
        projectsUpserted = projectResult.projectsUpserted;
    }

    if (params.allocationRows) {
        if (!params.resourceRows && !params.projectRows) {
            if (!params.session) {
                await hydrateContextFromDatabase(ctx, undefined);
            }
        }
        if (ctx.employeeByEmail.size === 0 || ctx.projectByCode.size === 0) {
            throw new Error(
                'Allocation import requires employees and projects in the database. Sync Resource and Project sheets first.'
            );
        }
        const allocResult = await importAllocationRows(params.allocationRows, ctx, writeOpts);
        sheetResults.push(allocResult);
        allocationsUpserted = allocResult.allocationsUpserted;
        weeklyEntriesUpserted = allocResult.weeklyEntriesUpserted;
        await applyProjectStatusFromAllocationRows(params.allocationRows, writeOpts);
    }

    if (!writeOpts.deferJunkSkillCleanup) {
        await cleanupJunkSkills(writeOpts);
    }

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
