import { ResourceImportRow } from './types/resource-row.dto';
import { isDummyResource } from './planner-import.utils';
import { AppError } from '../../common/errors/app-error';

/** Row-level validation report entry for Resource sync diagnostics. */
export interface ResourceRowValidationIssue {
    eid: string;
    name: string;
    email: string;
    reason: string;
}

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeResourceEmail(raw: string): string {
    return raw.trim().toLowerCase();
}

export function isValidResourceEmail(email: string): boolean {
    if (!email) return false;
    return EMAIL_FORMAT_RE.test(email);
}

export function formatResourceRowError(eid: string, reason: string): string {
    return `${eid}: ${reason}`;
}

function formatInvalidEmail(eid: string, rawEmail: string): string {
    return formatResourceRowError(eid, `Invalid email value="${rawEmail}"`);
}

function formatMissingField(eid: string, field: string): string {
    return formatResourceRowError(eid, `Missing required field ${field}`);
}

/**
 * Validate a single Resource row (EID, Name, Email).
 * Returns null when the row is valid; otherwise a diagnostic issue.
 */
export function validateResourceRow(row: ResourceImportRow): ResourceRowValidationIssue | null {
    const rawEmail = row.email ?? '';
    const eid = (row.employeeCode ?? '').trim() || 'unknown';
    const name = (row.name ?? '').trim();
    const emailNormalized = normalizeResourceEmail(rawEmail);

    if (!(row.employeeCode ?? '').trim()) {
        return { eid, name, email: rawEmail, reason: formatMissingField(eid, 'EID') };
    }

    if (!name) {
        return { eid, name: row.name ?? '', email: rawEmail, reason: formatMissingField(eid, 'Name') };
    }

    if (!rawEmail.trim()) {
        return { eid, name, email: rawEmail, reason: formatInvalidEmail(eid, '') };
    }

    if (!isValidResourceEmail(emailNormalized)) {
        return { eid, name, email: rawEmail, reason: formatInvalidEmail(eid, rawEmail) };
    }

    if (isDummyResource(name, row.employeeCode)) {
        return { eid, name, email: rawEmail, reason: formatResourceRowError(eid, 'Dummy resource row') };
    }

    return null;
}

export function validateResourceRows(rows: ResourceImportRow[]): ResourceRowValidationIssue[] {
    return rows
        .map((row) => validateResourceRow(row))
        .filter((issue): issue is ResourceRowValidationIssue => issue !== null);
}

export class ResourceValidationError extends AppError {
    readonly errors: string[];
    readonly validationReport: ResourceRowValidationIssue[];

    constructor(issues: ResourceRowValidationIssue[]) {
        const errors = issues.map((i) => i.reason);
        super(errors[0] ?? 'Resource validation failed', 422);
        this.errors = errors;
        this.validationReport = issues;
    }
}

/** Fail fast before MongoDB transaction when any Resource row is invalid. */
export function assertResourceRowsValid(rows: ResourceImportRow[]): void {
    const issues = validateResourceRows(rows);
    if (issues.length > 0) {
        throw new ResourceValidationError(issues);
    }
}
