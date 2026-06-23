import { ResourceImportRow } from '../types/resource-row.dto';
import { ProjectImportRow } from '../types/project-row.dto';
import { AllocationImportRow, AllocationWeekHour } from '../types/allocation-row.dto';
import { GoogleSheetWebhookBody } from '../types/import-result.types';
import {
    parseSkillList,
    parseSheetDateFromText,
    parseWeekMonday,
} from '../planner-import.utils';
import { filterImportableResourceRows } from '../resource-row.validation';
import { filterImportableAllocationRows } from '../allocation-row.validation';

function str(row: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
        const v = row[key];
        if (v != null && String(v).trim() !== '') return String(v).replace(/\s+/g, ' ').trim();
    }
    return '';
}

function num(row: Record<string, unknown>, ...keys: string[]): number {
    const n = Number(str(row, ...keys));
    return Number.isFinite(n) ? n : 0;
}

export function googleSheetRowToResourceRow(row: Record<string, unknown>): ResourceImportRow {
    const skillsRaw = str(
        row,
        'Skills',
        'skills',
        'Skill',
        'Skill (from HR)',
        'Skill (from HR) '
    );
    return {
        employeeCode: str(row, 'EID', 'eid', 'ID', 'id', 'EmployeeCode', 'employee_code'),
        name: str(row, 'Name', 'name'),
        jobRole: str(row, 'Job Role', 'JobRole', 'jobRole', 'job_role', 'Role', 'role'),
        resourceType: str(
            row,
            'Resource Type',
            'ResourceType',
            'resourceType',
            'resource_type',
            'Type',
            'type'
        ),
        availability: str(
            row,
            'Availability',
            'availability',
            'Availablility',
            'availablility',
            'Status',
            'status',
            'Active',
            'active'
        ),
        email: str(row, 'Email', 'email', 'eMail', 'EMail').trim().toLowerCase(),
        location: str(row, 'Location', 'location'),
        skills: skillsRaw ? parseSkillList(skillsRaw) : [],
    };
}

export function googleSheetRowsToResourceRows(rows: Record<string, unknown>[]): ResourceImportRow[] {
    return rows.map(googleSheetRowToResourceRow);
}

/** Map + drop placeholder/dummy/empty rows before import. */
export function googleSheetRowsToImportableResourceRows(
    rows: Record<string, unknown>[]
): ResourceImportRow[] {
    return filterImportableResourceRows(googleSheetRowsToResourceRows(rows));
}

/** Project sheet layout: status is column 4 (1-based) = index 3. */
export const PROJECT_STATUS_COLUMN_INDEX = 3;

function cellRaw(value: unknown): string {
    if (value == null) return '';
    return String(value).replace(/\s+/g, ' ').trim();
}

function attachProjectStatusColumn4(obj: Record<string, unknown>, values?: unknown[]): void {
    if (!values || values.length <= PROJECT_STATUS_COLUMN_INDEX) return;
    const v = values[PROJECT_STATUS_COLUMN_INDEX];
    if (v != null && cellRaw(v) !== '') {
        obj.__statusCol4 = v;
    }
}

/** Read status from column 4 — authoritative on the Project sheet. */
function statusFromProjectColumn4(row: Record<string, unknown>): string {
    return str(
        row,
        '__statusCol4',
        '4',
        'column4',
        'Column4',
        'Column 4',
        'D',
        'd',
        'col4',
        'COL4'
    );
}

function looksLikeProjectStatus(value: string): boolean {
    const s = value.trim().toLowerCase();
    if (!s) return false;
    return (
        s === 'active' ||
        s === 'completed' ||
        s === 'proposal lost' ||
        s === 'proposal' ||
        s === 'pre-proposal' ||
        s === 'planning' ||
        s === 'on hold' ||
        s === 'onhold' ||
        s === 'lost'
    );
}

/** Column 4 is authoritative; named Status keys are fallbacks (duplicate headers may overwrite). */
export function resolveProjectStatusRaw(row: Record<string, unknown>): string {
    const col4 = statusFromProjectColumn4(row);
    if (col4) return col4;

    const primary = str(
        row,
        'Status',
        'status',
        'Project Status',
        'ProjectStatus',
        'project_status',
        'Status_1',
        'Status1',
        'status_1',
        'StatusAlt',
        'status_alt'
    );
    if (primary && looksLikeProjectStatus(primary)) return primary;

    for (const [key, value] of Object.entries(row)) {
        if (!/^status(\s*\(\d+\)|_\d+)?$/i.test(key.trim())) continue;
        const v = String(value ?? '').trim();
        if (v && looksLikeProjectStatus(v)) return v;
    }

    for (const value of Object.values(row)) {
        const v = String(value ?? '').trim();
        if (v && looksLikeProjectStatus(v)) return v;
    }

    return primary;
}

function objectFromHeadersFirstWins(
    headers: string[],
    values: unknown[]
): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    const seen = new Set<string>();
    for (let i = 0; i < headers.length; i++) {
        const key = String(headers[i] ?? '').trim();
        if (!key) continue;
        const lower = key.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        const val = values[i];
        obj[key] = val == null ? '' : val;
    }
    attachProjectStatusColumn4(obj, values);
    return obj;
}

function isHeaderValuePairRow(row: unknown): row is { header: string; value: unknown }[] {
    return (
        Array.isArray(row) &&
        row.length > 0 &&
        typeof row[0] === 'object' &&
        row[0] !== null &&
        'header' in row[0]
    );
}

function objectFromHeaderValuePairs(
    pairs: { header: string; value: unknown }[]
): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    const seen = new Set<string>();
    for (let i = 0; i < pairs.length; i++) {
        const { header, value } = pairs[i];
        const key = String(header ?? '').trim();
        if (!key) continue;
        const lower = key.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        obj[key] = value == null ? '' : value;
        if (i === PROJECT_STATUS_COLUMN_INDEX && value != null && cellRaw(value) !== '') {
            obj.__statusCol4 = value;
        }
    }
    return obj;
}

/** Normalize Apps Script payloads — supports object rows, header+value arrays, and header/value pairs. */
export function coerceWebhookRows(
    rows: GoogleSheetWebhookBody['rows'] | undefined,
    headers?: string[]
): Record<string, unknown>[] {
    if (!rows?.length) return [];

    if (Array.isArray(rows[0])) {
        return (rows as unknown[][]).map((values) => {
            const valueArr = values as unknown[];
            const obj = headers?.length
                ? objectFromHeadersFirstWins(headers, valueArr)
                : ({} as Record<string, unknown>);
            attachProjectStatusColumn4(obj, valueArr);
            return obj;
        });
    }

    if (isHeaderValuePairRow(rows[0])) {
        return (rows as { header: string; value: unknown }[][]).map(objectFromHeaderValuePairs);
    }

    return rows as Record<string, unknown>[];
}

export function googleSheetRowToProjectRow(row: Record<string, unknown>): ProjectImportRow {
    const durationWeeks = num(row, 'Duration', 'duration', 'DurationWeeks', 'duration_weeks');
    return {
        pid: str(row, 'PID', 'pid', 'ProjectId', 'project_id', '2mo'),
        name: str(row, 'Name', 'name', 'ProjectName', 'project_name', 'Project', 'project'),
        type: str(row, 'Type', 'type', 'ProjectType', 'project_type'),
        statusRaw: resolveProjectStatusRaw(row),
        confirmedStart: parseSheetDateFromText(
            str(row, 'Confirmed Start', 'ConfirmedStart', 'confirmed_start', 'Confirmed Starting Date')
        ),
        estimatedStart: parseSheetDateFromText(
            str(row, 'Estimated Start', 'EstimatedStart', 'estimated_start', 'Estimated Starting Date')
        ),
        durationWeeks,
        architect: str(row, 'Architect', 'architect', 'Achitect name/ type'),
        beRequired: num(
            row,
            'BE Required',
            'BERequired',
            'be_required',
            'BE',
            'BE Resources Required'
        ),
        mobileRequired: num(row, 'Mobile Required', 'MobileRequired', 'mobile_required', 'Mobile'),
        feRequired: num(row, 'FE Required', 'FERequired', 'fe_required', 'FE'),
        qaRequired: num(row, 'QA Required', 'QARequired', 'qa_required', 'QA'),
        tech: str(row, 'Tech', 'tech', 'Technology', 'technology', 'Project Tech Req'),
    };
}

export function googleSheetRowsToProjectRows(rows: Record<string, unknown>[]): ProjectImportRow[] {
    return rows.map(googleSheetRowToProjectRow);
}

/**
 * Allocation rows from Google Sheets include dynamic week columns as keys on each row object.
 * weekHeaderKeys lists column header labels (e.g. "5-Jan") in order; values are read from row[header].
 */
export function googleSheetRowToAllocationRow(
    row: Record<string, unknown>,
    weekHeaderKeys: string[]
): AllocationImportRow {
    const weeklyHours: AllocationWeekHour[] = [];
    for (const header of weekHeaderKeys) {
        const raw = row[header];
        const parsed = Number(raw);
        const hours = Number.isFinite(parsed) ? parsed : 0;
        const monday = parseWeekMonday(header);
        if (monday) weeklyHours.push({ weekStart: monday, hours });
    }

    return {
        pid: str(row, 'PID', 'pid', 'P-id', 'P-Id', 'P_id').toUpperCase(),
        projectName: str(
            row,
            'Project',
            'Project Name',
            'ProjectName',
            'project_name',
            'Name'
        ),
        projectType: str(row, 'Project Type', 'ProjectType', 'project_type', 'Type'),
        projectStatus: str(row, 'Project Status', 'ProjectStatus', 'project_status', 'Status'),
        employeeCode: str(row, 'EID', 'eid', 'E-id', 'E-Id', 'EmployeeCode').toUpperCase(),
        resourceName: str(row, 'Resource', 'Resource Name', 'ResourceName', 'resource_name', 'Name'),
        jobRole: str(
            row,
            'Resource Role',
            'ResourceRole',
            'Job Role',
            'JobRole',
            'job_role'
        ),
        resourceType: str(row, 'Resource Type', 'ResourceType', 'resource_type'),
        activeFlag: str(row, 'Active', 'active', 'Availability', 'availability'),
        weeklyHours,
    };
}

export function googleSheetRowsToImportableAllocationRows(
    rows: Record<string, unknown>[],
    weekHeaderKeys: string[] = []
): AllocationImportRow[] {
    const headers =
        weekHeaderKeys.length > 0
            ? weekHeaderKeys
            : extractWeekHeadersFromRows(rows);
    return filterImportableAllocationRows(
        rows.map((row) => googleSheetRowToAllocationRow(row, headers))
    );
}

export function googleSheetRowsToAllocationRows(
    rows: Record<string, unknown>[],
    weekHeaderKeys: string[] = []
): AllocationImportRow[] {
    const headers =
        weekHeaderKeys.length > 0
            ? weekHeaderKeys
            : extractWeekHeadersFromRows(rows);
    return rows.map((row) => googleSheetRowToAllocationRow(row, headers));
}

/** Infer week column keys from first row — keys matching date-like patterns, excluding fixed fields. */
function extractWeekHeadersFromRows(rows: Record<string, unknown>[]): string[] {
    if (rows.length === 0) return [];
    const fixed = new Set([
        'pid', 'p-id', 'p_id', 'eid', 'e-id', 'e_id', 'name', 'email', 'status', 'type',
        'project', 'projectname', 'project name', 'project type', 'project status',
        'resource', 'resource name', 'resource role', 'resourcerole', 'resource type',
        'job role', 'active', 'column 62', 'manager', 'location',
    ]);
    return Object.keys(rows[0]).filter((key) => {
        const lower = key.toLowerCase();
        if (fixed.has(lower)) return false;
        return parseWeekMonday(key) !== null || /^\d{1,2}[-\s][A-Za-z]{3}/i.test(key);
    });
}

export function extractWeekHeadersFromWebhook(
    rows: Record<string, unknown>[],
    weekHeaders?: Record<string, string>[]
): string[] {
    if (weekHeaders?.length) {
        return weekHeaders.map((h) => Object.values(h)[0]).filter(Boolean);
    }
    return extractWeekHeadersFromRows(rows);
}
