import { ResourceImportRow } from '../types/resource-row.dto';
import { ProjectImportRow } from '../types/project-row.dto';
import { AllocationImportRow, AllocationWeekHour } from '../types/allocation-row.dto';
import {
    parseSkillList,
    parseSheetDateFromText,
    parseWeekMonday,
} from '../planner-import.utils';

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
    const skillsRaw = str(row, 'Skills', 'skills', 'Skill');
    return {
        employeeCode: str(row, 'EID', 'eid', 'EmployeeCode', 'employee_code'),
        name: str(row, 'Name', 'name'),
        jobRole: str(row, 'Job Role', 'JobRole', 'jobRole', 'job_role'),
        resourceType: str(row, 'Resource Type', 'ResourceType', 'resourceType', 'resource_type'),
        availability: str(row, 'Availability', 'availability'),
        email: str(row, 'Email', 'email').toLowerCase(),
        location: str(row, 'Location', 'location'),
        skills: skillsRaw ? parseSkillList(skillsRaw) : [],
    };
}

export function googleSheetRowsToResourceRows(rows: Record<string, unknown>[]): ResourceImportRow[] {
    return rows.map(googleSheetRowToResourceRow);
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
        pid: str(row, 'PID', 'pid').toUpperCase(),
        projectName: str(row, 'Project Name', 'ProjectName', 'project_name', 'Name'),
        projectType: str(row, 'Project Type', 'ProjectType', 'project_type', 'Type'),
        projectStatus: str(row, 'Project Status', 'ProjectStatus', 'project_status', 'Status'),
        employeeCode: str(row, 'EID', 'eid', 'EmployeeCode').toUpperCase(),
        resourceName: str(row, 'Resource Name', 'ResourceName', 'resource_name', 'Name'),
        jobRole: str(row, 'Job Role', 'JobRole', 'job_role'),
        resourceType: str(row, 'Resource Type', 'ResourceType', 'resource_type'),
        activeFlag: str(row, 'Active', 'active', 'Availability', 'availability'),
        weeklyHours,
    };
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
        'pid', 'eid', 'name', 'email', 'status', 'type', 'projectname', 'project name',
        'project type', 'project status', 'resource name', 'job role', 'resource type', 'active',
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
