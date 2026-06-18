import { ResourceImportRow } from '../types/resource-row.dto';
import { ProjectImportRow } from '../types/project-row.dto';
import { AllocationImportRow, AllocationWeekHour } from '../types/allocation-row.dto';
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
            'availablility'
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

export function googleSheetRowToProjectRow(row: Record<string, unknown>): ProjectImportRow {
    const durationWeeks = num(row, 'Duration', 'duration', 'DurationWeeks', 'duration_weeks');
    const statusAlt = str(row, 'StatusAlt', 'status_alt');
    return {
        pid: str(row, 'PID', 'pid', 'ProjectId', 'project_id'),
        name: str(row, 'Name', 'name', 'ProjectName', 'project_name'),
        type: str(row, 'Type', 'type', 'ProjectType', 'project_type'),
        statusRaw: str(row, 'Status', 'status') || statusAlt,
        confirmedStart: parseSheetDateFromText(str(row, 'Confirmed Start', 'ConfirmedStart', 'confirmed_start')),
        estimatedStart: parseSheetDateFromText(str(row, 'Estimated Start', 'EstimatedStart', 'estimated_start')),
        durationWeeks,
        architect: str(row, 'Architect', 'architect'),
        beRequired: num(row, 'BE Required', 'BERequired', 'be_required', 'BE'),
        mobileRequired: num(row, 'Mobile Required', 'MobileRequired', 'mobile_required', 'Mobile'),
        feRequired: num(row, 'FE Required', 'FERequired', 'fe_required', 'FE'),
        qaRequired: num(row, 'QA Required', 'QARequired', 'qa_required', 'QA'),
        tech: str(row, 'Tech', 'tech', 'Technology', 'technology'),
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
        const hours = Number(raw);
        if (!Number.isFinite(hours) || hours <= 0) continue;
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
