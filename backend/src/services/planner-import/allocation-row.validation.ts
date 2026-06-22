import { AllocationImportRow } from './types/allocation-row.dto';
import { isDummyResource } from './planner-import.utils';

/** Rows excluded from allocation import (dummy placeholders, empty assignments). */
export function shouldSkipAllocationRow(row: AllocationImportRow): boolean {
    const pid = (row.pid ?? '').trim();
    const projectName = (row.projectName ?? '').trim();
    const eid = (row.employeeCode ?? '').trim();
    const resourceName = (row.resourceName ?? '').trim();

    if (!pid && !projectName && !eid && !resourceName) return true;
    if (isDummyResource(resourceName, eid)) return true;

    const hasAssignment =
        !!(pid || projectName) && !!(eid || resourceName);
    if (!hasAssignment) return true;

    return false;
}

export function filterImportableAllocationRows(rows: AllocationImportRow[]): AllocationImportRow[] {
    return rows.filter((row) => !shouldSkipAllocationRow(row));
}
