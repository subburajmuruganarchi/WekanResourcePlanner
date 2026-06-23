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
import { WeeklyAllocationEntry } from '../weekly-allocations/weekly-allocation-entry.model';
import type { WeeklyGridBulkUpdateItem } from '../weekly-allocations/weekly-allocation.types';
import {
    formatWeekSheetHeader,
    projectCodeToPid,
} from '../../services/planner-import/planner-import.utils';

const SHEET_SYNC_TIMEOUT_MS = 45_000;

const DEFAULT_ALLOCATION_SHEET = 'Project_Allocation';

/** Matches Apps Script Project_Allocation cell patch (planned hours only). */
export interface AllocationSheetSyncCell {
    pid: string;
    eid: string;
    weekHeader: string;
    weekStart?: string;
    plannedHours: number;
    projectName?: string;
    resourceName?: string;
    jobRole?: string;
    projectType?: string;
    projectStatus?: string;
    activeFlag?: string;
}

/** Weekly Planner tab row — plan, actual, and delta per week. */
export interface WeeklyPlannerWeekCell {
    weekHeader: string;
    weekStart: string;
    plannedHours: number;
    actualHours: number;
    deltaHours: number;
}

export interface WeeklyPlannerUpsertRow {
    pid: string;
    eid: string;
    projectName: string;
    resourceName: string;
    jobRole?: string;
    projectType?: string;
    projectStatus?: string;
    activeFlag?: string;
    weeklyWeeks: WeeklyPlannerWeekCell[];
}

type SheetSyncPayload =
    | {
          action: 'PATCH_ALLOCATION_CELLS';
          cells: AllocationSheetSyncCell[];
          targetSheets?: string[];
          syncKey?: string;
      }
    | {
          action: 'UPSERT_WEEKLY_PLANNER_ROWS';
          sheetName?: string;
          rows: WeeklyPlannerUpsertRow[];
          syncKey?: string;
      };

function weeklyPlannerSheetName(): string {
    return env.GOOGLE_WEEKLY_PLANNER_SHEET_NAME?.trim() || 'Weekly Planner';
}

async function loadEmployeeProjectMaps(employeeIds: string[], projectIds: string[]) {
    const [employees, projects] = await Promise.all([
        Employee.find({ _id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) } })
            .select('_id employee_code first_name last_name job_role_id')
            .populate('job_role_id', 'role_name')
            .lean(),
        Project.find({ _id: { $in: projectIds.map((id) => new Types.ObjectId(id)) } })
            .select('_id project_code project_name project_type status')
            .lean(),
    ]);

    return {
        empById: new Map(employees.map((e) => [e._id.toString(), e])),
        projById: new Map(projects.map((p) => [p._id.toString(), p])),
    };
}

async function mapUpdatesToSheetCells(
    updates: WeeklyGridBulkUpdateItem[]
): Promise<AllocationSheetSyncCell[]> {
    const withHours = updates.filter((u) => u.plannedHours !== undefined);
    if (withHours.length === 0) return [];

    const employeeIds = [...new Set(withHours.map((u) => u.employeeId))];
    const projectIds = [...new Set(withHours.map((u) => u.projectId))];
    const { empById, projById } = await loadEmployeeProjectMaps(employeeIds, projectIds);

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
            });
            continue;
        }

        let weekStartDate: Date;
        try {
            weekStartDate = startOfUtcWeek(parseWeekStartParam(u.weekStart));
        } catch {
            continue;
        }

        const role = emp?.job_role_id as { role_name?: string } | undefined;

        cells.push({
            pid,
            eid,
            weekHeader: formatWeekSheetHeader(weekStartDate),
            weekStart: weekStartToIsoDate(weekStartDate),
            plannedHours: u.plannedHours!,
            projectName: proj?.project_name,
            resourceName: emp
                ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()
                : undefined,
            jobRole: role?.role_name,
            projectType: proj?.project_type,
            projectStatus: proj?.status,
            activeFlag: 'Active',
        });
    }

    return cells;
}

async function buildWeeklyPlannerUpsertRows(
    updates: WeeklyGridBulkUpdateItem[]
): Promise<WeeklyPlannerUpsertRow[]> {
    if (updates.length === 0) return [];

    const pairs = new Map<string, { employeeId: string; projectId: string }>();
    for (const u of updates) {
        pairs.set(`${u.employeeId}:${u.projectId}`, {
            employeeId: u.employeeId,
            projectId: u.projectId,
        });
    }

    const employeeIds = [...new Set([...pairs.values()].map((p) => p.employeeId))];
    const projectIds = [...new Set([...pairs.values()].map((p) => p.projectId))];
    const { empById, projById } = await loadEmployeeProjectMaps(employeeIds, projectIds);

    const weekStarts = [
        ...new Set(
            updates.map((u) => {
                try {
                    return weekStartToIsoDate(startOfUtcWeek(parseWeekStartParam(u.weekStart)));
                } catch {
                    return null;
                }
            })
        ),
    ].filter((w): w is string => Boolean(w));

    const sortedWeeks = [...weekStarts].sort();
    const minWeek = sortedWeeks[0];
    const maxWeek = sortedWeeks.at(-1);
    if (!minWeek || !maxWeek) return [];

    const entries = await WeeklyAllocationEntry.find({
        employee_id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) },
        project_id: { $in: projectIds.map((id) => new Types.ObjectId(id)) },
        week_start: {
            $gte: startOfUtcWeek(parseWeekStartParam(minWeek)),
            $lte: startOfUtcWeek(parseWeekStartParam(maxWeek)),
        },
    }).lean();

    const entriesByPair = new Map<string, typeof entries>();
    for (const e of entries) {
        const key = `${e.employee_id.toString()}:${e.project_id.toString()}`;
        const list = entriesByPair.get(key) ?? [];
        list.push(e);
        entriesByPair.set(key, list);
    }

    const rows: WeeklyPlannerUpsertRow[] = [];

    for (const { employeeId, projectId } of pairs.values()) {
        const emp = empById.get(employeeId);
        const proj = projById.get(projectId);
        const pid = proj ? projectCodeToPid(proj.project_code) : null;
        const eid = emp?.employee_code?.trim().toUpperCase();
        if (!pid || !eid || !proj) continue;

        const role = emp?.job_role_id as { role_name?: string } | undefined;
        const pairEntries = entriesByPair.get(`${employeeId}:${projectId}`) ?? [];

        rows.push({
            pid,
            eid,
            projectName: proj.project_name,
            resourceName: emp
                ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()
                : eid,
            jobRole: role?.role_name ?? 'Consultant',
            projectType: proj.project_type ?? '',
            projectStatus: proj.status ?? 'Active',
            activeFlag: 'Active',
            weeklyWeeks: pairEntries.map((e) => {
                const planned = e.planned_hours ?? 0;
                const actual = e.actual_hours ?? 0;
                return {
                    weekHeader: formatWeekSheetHeader(e.week_start),
                    weekStart: weekStartToIsoDate(e.week_start),
                    plannedHours: planned,
                    actualHours: actual,
                    deltaHours: actual - planned,
                };
            }),
        });
    }

    return rows;
}

function resolveSheetSyncUrl(): string | undefined {
    return env.GOOGLE_SHEET_SYNC_URL ?? env.GOOGLE_APPS_SCRIPT_WEB_APP_URL;
}

async function postToGoogleSheetSync(payload: SheetSyncPayload): Promise<void> {
    const url = resolveSheetSyncUrl();
    if (!url) {
        structuredLogger.warn(
            'GOOGLE SHEET SYNC SKIPPED — set GOOGLE_SHEET_SYNC_URL or GOOGLE_APPS_SCRIPT_WEB_APP_URL'
        );
        return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHEET_SYNC_TIMEOUT_MS);

    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const body: SheetSyncPayload = { ...payload };
        if (env.GOOGLE_SHEET_SYNC_SECRET) {
            headers['x-r360-sync-key'] = env.GOOGLE_SHEET_SYNC_SECRET;
            body.syncKey = env.GOOGLE_SHEET_SYNC_SECRET;
        }

        structuredLogger.info('GOOGLE SHEET SYNC POST', {
            action: payload.action,
            cells: 'cells' in payload ? payload.cells.length : undefined,
            rows: 'rows' in payload ? payload.rows.length : undefined,
            targetSheets: 'targetSheets' in payload ? payload.targetSheets : undefined,
        });

        const { response, text } = await postJsonToAppsScriptWebApp(url, body, {
            headers,
            signal: controller.signal,
        });
        const parsed = parseAppsScriptActionResponse(text);

        if (!response.ok || !isAppsScriptActionSuccess(parsed)) {
            structuredLogger.error('GOOGLE SHEET SYNC FAILED', {
                action: payload.action,
                httpStatus: response.status,
                actionStatus: parsed.status,
                actionError: parsed.error ?? parsed.message,
                bodyPreview: text.slice(0, 500),
            });
            return;
        }

        structuredLogger.info('GOOGLE SHEET SYNC SUCCESS', {
            action: payload.action,
            applied: parsed.applied,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        structuredLogger.error('GOOGLE SHEET SYNC ERROR', { action: payload.action, error: message });
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Push weekly planner data to Google Sheet:
 * - PATCH planned hours on Project_Allocation only
 * - UPSERT plan / actual / delta on Weekly Planner tab
 */
export async function syncAllocationToGoogleSheet(
    updates: WeeklyGridBulkUpdateItem[]
): Promise<void> {
    const cells = await mapUpdatesToSheetCells(updates);
    const rows = await buildWeeklyPlannerUpsertRows(updates);

    if (cells.length === 0 && rows.length === 0) {
        structuredLogger.warn('GOOGLE SHEET SYNC — nothing to push after mapping');
        return;
    }

    if (cells.length > 0) {
        await postToGoogleSheetSync({
            action: 'PATCH_ALLOCATION_CELLS',
            cells,
            targetSheets: [DEFAULT_ALLOCATION_SHEET],
        });
    }

    if (rows.length > 0) {
        await postToGoogleSheetSync({
            action: 'UPSERT_WEEKLY_PLANNER_ROWS',
            sheetName: weeklyPlannerSheetName(),
            rows,
        });
    }
}

export const allocationSheetSyncService = {
    syncAllocationToGoogleSheet,
};
