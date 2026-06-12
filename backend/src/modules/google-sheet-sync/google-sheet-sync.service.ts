import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/app-error';
import { runPlannerSheetImport } from '../../services/planner-import/planner-import.service';
import {
    GoogleSheetWebhookBody,
    GoogleSheetSyncResponse,
} from '../../services/planner-import/types/import-result.types';
import {
    googleSheetRowsToResourceRows,
    googleSheetRowsToProjectRows,
    googleSheetRowsToAllocationRows,
    extractWeekHeadersFromWebhook,
} from '../../services/planner-import/adapters/google-sheet-row.adapter';
import { SyncRun } from './sync-run.model';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';

export type SupportedSheet = 'Resource' | 'Project' | 'Project_Allocation';

const SHEET_ORDER: SupportedSheet[] = ['Resource', 'Project', 'Project_Allocation'];
const APPS_SCRIPT_SYNC_TIMEOUT_MS = 300_000;

/** Trigger full Resource → Project → Project_Allocation sync via Google Apps Script web app. */
export async function triggerFullGoogleSheetSync(): Promise<unknown> {
    const url = env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;
    if (!url) {
        throw new AppError(
            'Google Apps Script web app URL is not configured (GOOGLE_APPS_SCRIPT_WEB_APP_URL).',
            503
        );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_SYNC_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: controller.signal,
            redirect: 'follow',
        });

        const text = await response.text();
        if (!response.ok) {
            throw new AppError(
                `Google Apps Script sync failed (${response.status}): ${text.slice(0, 500)}`,
                502
            );
        }

        try {
            return JSON.parse(text) as unknown;
        } catch {
            return { raw: text };
        }
    } catch (err) {
        if (err instanceof AppError) throw err;
        if (err instanceof Error && err.name === 'AbortError') {
            throw new AppError('Google Apps Script sync timed out after 5 minutes.', 504);
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(`Failed to trigger Google Apps Script sync: ${message}`, 502);
    } finally {
        clearTimeout(timeout);
    }
}

export async function processGoogleSheetWebhook(
    body: GoogleSheetWebhookBody
): Promise<GoogleSheetSyncResponse> {
    const sheet = body.sheet;
    if (!SHEET_ORDER.includes(sheet)) {
        throw new Error(`Unsupported sheet: ${sheet}. Use Resource, Project, or Project_Allocation.`);
    }

    if (sheet === 'Project_Allocation') {
        await assertAllocationDependencies();
    }

    const syncId = uuidv4();
    const startedAt = new Date();
    const syncRun = await SyncRun.create({
        sheet,
        startedAt,
        rowsReceived: body.rows?.length ?? 0,
        rowsProcessed: 0,
        rowsSkipped: 0,
        errorMessages: [],
        status: 'FAILED',
        syncId,
    });

    try {
        let result;

        if (sheet === 'Resource') {
            const resourceRows = googleSheetRowsToResourceRows(body.rows ?? []);
            result = await runPlannerSheetImport({
                resourceRows,
                resourceOnly: true,
                syncId,
            });
        } else if (sheet === 'Project') {
            const projectRows = googleSheetRowsToProjectRows(body.rows ?? []);
            result = await runPlannerSheetImport({
                projectRows,
                syncId,
            });
        } else {
            const weekHeaders = extractWeekHeadersFromWebhook(body.rows ?? [], body.weekHeaders);
            const allocationRows = googleSheetRowsToAllocationRows(body.rows ?? [], weekHeaders);
            result = await runPlannerSheetImport({
                allocationRows,
                syncId,
            });
        }

        const response: GoogleSheetSyncResponse = {
            success: true,
            sheet,
            rowsReceived: result.rowsReceived ?? body.rows.length,
            rowsProcessed: result.rowsProcessed ?? 0,
            rowsSkipped: result.rowsSkipped ?? 0,
            errors: result.errors ?? [],
            skippedRows: result.skippedRows,
            syncRunId: syncRun._id.toString(),
        };

        await SyncRun.findByIdAndUpdate(syncRun._id, {
            completedAt: new Date(),
            rowsProcessed: response.rowsProcessed,
            rowsSkipped: response.rowsSkipped,
            errorMessages: response.errors,
            skippedRows: response.skippedRows,
            status: 'SUCCESS',
        });

        return response;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await SyncRun.findByIdAndUpdate(syncRun._id, {
            completedAt: new Date(),
            errors: [message],
            status: 'FAILED',
        });
        throw err;
    }
}

async function assertAllocationDependencies(): Promise<void> {
    const [employeeCount, projectCount] = await Promise.all([
        Employee.countDocuments({ is_active: { $ne: false } }),
        Project.countDocuments({ is_active: { $ne: false } }),
    ]);

    if (employeeCount === 0) {
        throw new Error('Allocation sync requires Resource data. Sync Resource sheet first.');
    }
    if (projectCount === 0) {
        throw new Error('Allocation sync requires Project data. Sync Project sheet first.');
    }
}

export async function getLatestSyncStatus(): Promise<{
    sheets: Array<{
        sheet: string;
        lastSyncAt: string | null;
        status: string | null;
        rowsProcessed: number;
        rowsSkipped: number;
        errors: string[];
    }>;
}> {
    const sheets: SupportedSheet[] = ['Resource', 'Project', 'Project_Allocation'];
    const results = await Promise.all(
        sheets.map(async (sheet) => {
            const latest = await SyncRun.findOne({ sheet }).sort({ startedAt: -1 }).lean();
            return {
                sheet,
                lastSyncAt: latest?.completedAt?.toISOString() ?? latest?.startedAt?.toISOString() ?? null,
                status: latest?.status ?? null,
                rowsProcessed: latest?.rowsProcessed ?? 0,
                rowsSkipped: latest?.rowsSkipped ?? 0,
                errors: latest?.errorMessages ?? [],
            };
        })
    );
    return { sheets: results };
}
