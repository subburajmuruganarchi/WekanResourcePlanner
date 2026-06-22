import { Types } from 'mongoose';
import { env } from '../../config/env';
import { structuredLogger } from '../../common/logger';
import {
    isAppsScriptActionSuccess,
    parseAppsScriptActionResponse,
    postJsonToAppsScriptWebApp,
} from '../../common/http/apps-script-fetch';
import { parseWeekStartParam, startOfUtcWeek, weekStartToIsoDate } from '../../common/utils/week.util';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';
import type { WeeklyGridBulkUpdateItem } from '../weekly-allocations/weekly-allocation.types';
import {
    formatWeekSheetHeader,
    projectCodeToPid,
} from '../../services/planner-import/planner-import.utils';

const SHEET_SYNC_TIMEOUT_MS = 30_000;

/** Matches live Apps Script updateProjectAllocationCells() cell shape. */
export interface AllocationSheetSyncCell {
    pid: string;
    eid: string;
    weekHeader: string;
    /** ISO Monday (YYYY-MM-DD) — Apps Script fallback when header text differs. */
    weekStart?: string;
    plannedHours: number;
}

export interface AllocationSheetSyncPayload {
    action: 'PATCH_ALLOCATION_CELLS';
    cells: AllocationSheetSyncCell[];
    syncKey?: string;
}

async function mapUpdatesToSheetCells(
    updates: WeeklyGridBulkUpdateItem[]
): Promise<AllocationSheetSyncCell[]> {
    const withHours = updates.filter((u) => u.plannedHours !== undefined);
    if (withHours.length === 0) return [];

    const employeeIds = [...new Set(withHours.map((u) => u.employeeId))];
    const projectIds = [...new Set(withHours.map((u) => u.projectId))];

    const [employees, projects] = await Promise.all([
        Employee.find({ _id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) } })
            .select('_id employee_code')
            .lean(),
        Project.find({ _id: { $in: projectIds.map((id) => new Types.ObjectId(id)) } })
            .select('_id project_code')
            .lean(),
    ]);

    const empById = new Map(employees.map((e) => [e._id.toString(), e]));
    const projById = new Map(projects.map((p) => [p._id.toString(), p]));

    const cells: AllocationSheetSyncCell[] = [];

    for (const u of withHours) {
        const emp = empById.get(u.employeeId);
        const proj = projById.get(u.projectId);
        const pid = proj ? projectCodeToPid(proj.project_code) : null;
        const eid = emp?.employee_code?.trim().toUpperCase();

        if (!pid || !eid) {
            structuredLogger.warn('ALLOCATION SHEET SYNC SKIP — missing PID or EID', {
                employeeId: u.employeeId,
                projectId: u.projectId,
                projectCode: proj?.project_code,
                employeeCode: emp?.employee_code,
                hasPid: !!pid,
                hasEid: !!eid,
            });
            continue;
        }

        let weekStartDate: Date;
        try {
            weekStartDate = startOfUtcWeek(parseWeekStartParam(u.weekStart));
        } catch {
            structuredLogger.warn('ALLOCATION SHEET SYNC SKIP — invalid weekStart', {
                weekStart: u.weekStart,
            });
            continue;
        }

        cells.push({
            pid,
            eid,
            weekHeader: formatWeekSheetHeader(weekStartDate),
            weekStart: weekStartToIsoDate(weekStartDate),
            plannedHours: u.plannedHours!,
        });
    }

    return cells;
}

function resolveSheetSyncUrl(): string | undefined {
    return env.GOOGLE_SHEET_SYNC_URL ?? env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;
}

async function postToGoogleSheetSync(payload: AllocationSheetSyncPayload): Promise<void> {
    const url = resolveSheetSyncUrl();
    if (!url) {
        structuredLogger.warn(
            'ALLOCATION SHEET SYNC SKIPPED — set GOOGLE_SHEET_SYNC_URL or GOOGLE_APPS_SCRIPT_WEB_APP_URL'
        );
        return;
    }

    structuredLogger.info('ALLOCATION SHEET SYNC START', {
        updateCount: payload.cells.length,
        urlSource: env.GOOGLE_SHEET_SYNC_URL ? 'GOOGLE_SHEET_SYNC_URL' : 'GOOGLE_APPS_SCRIPT_WEB_APP_URL',
        cells: payload.cells,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHEET_SYNC_TIMEOUT_MS);

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        const body: AllocationSheetSyncPayload = { ...payload };
        if (env.GOOGLE_SHEET_SYNC_SECRET) {
            headers['x-r360-sync-key'] = env.GOOGLE_SHEET_SYNC_SECRET;
            body.syncKey = env.GOOGLE_SHEET_SYNC_SECRET;
        }

        const { response, text } = await postJsonToAppsScriptWebApp(url, body, {
            headers,
            signal: controller.signal,
        });
        const parsed = parseAppsScriptActionResponse(text);

        if (!response.ok || !isAppsScriptActionSuccess(parsed)) {
            structuredLogger.error('ALLOCATION SHEET SYNC FAILED', {
                httpStatus: response.status,
                actionStatus: parsed.status,
                actionError: parsed.error ?? parsed.message,
                failed: parsed.failed,
                bodyPreview: text.slice(0, 500),
                updateCount: payload.cells.length,
            });
            return;
        }

        structuredLogger.info('ALLOCATION SHEET SYNC SUCCESS', {
            httpStatus: response.status,
            actionStatus: parsed.status,
            applied: parsed.applied ?? payload.cells.length,
            updateCount: payload.cells.length,
            bodyPreview: text.slice(0, 300),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        structuredLogger.error('ALLOCATION SHEET SYNC ERROR', {
            error: message,
            updateCount: payload.cells.length,
        });
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Push accepted grid saves to Google Sheet Project_Allocation tab.
 * Failures are logged only — callers must not await for Mongo commit success.
 */
export async function syncAllocationToGoogleSheet(
    updates: WeeklyGridBulkUpdateItem[]
): Promise<void> {
    const cells = await mapUpdatesToSheetCells(updates);
    if (cells.length === 0) {
        structuredLogger.warn('ALLOCATION SHEET SYNC — no mappable cells after PID/EID resolution');
        return;
    }

    await postToGoogleSheetSync({
        action: 'PATCH_ALLOCATION_CELLS',
        cells,
    });
}

export const allocationSheetSyncService = {
    syncAllocationToGoogleSheet,
};
