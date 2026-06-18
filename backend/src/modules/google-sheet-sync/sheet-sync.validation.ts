import { AppError } from '../../common/errors/app-error';
import {
    FullSyncSummary,
    PlannerImportResult,
    SheetSyncSummary,
} from '../../services/planner-import/types/import-result.types';

export function validateSheetResult(
    sheet: string,
    received: number,
    result: PlannerImportResult
): void {
    const errors = result.errors ?? [];
    const processed = result.rowsProcessed ?? 0;
    const skipped = result.rowsSkipped ?? 0;

    if (errors.length > 0) {
        throw new AppError(
            `${sheet}: import failed with ${errors.length} error(s). First: ${errors[0]}`,
            422
        );
    }
    if (skipped > 0) {
        throw new AppError(
            `${sheet}: ${skipped} row(s) skipped — full dataset not applied`,
            422
        );
    }
    if (processed !== received) {
        throw new AppError(
            `${sheet}: received ${received} but processed ${processed}`,
            422
        );
    }
}

export function assertFullSyncSummary(summary: FullSyncSummary): void {
    const failures: string[] = [];

    for (const [name, s] of Object.entries(summary) as [string, SheetSyncSummary][]) {
        if (s.status !== 'SUCCESS') {
            failures.push(`${name}: batch run status is ${s.status}`);
            continue;
        }
        if (s.errors.length > 0) {
            failures.push(`${name}: ${s.errors[0]}`);
            continue;
        }
        if (s.skipped > 0) {
            failures.push(`${name}: ${s.skipped} rows skipped`);
            continue;
        }
        if (s.received > 0 && s.processed !== s.received) {
            failures.push(`${name}: received ${s.received} but processed ${s.processed}`);
        }
    }

    if (failures.length > 0) {
        throw new AppError(`Full sync validation failed: ${failures.join('; ')}`, 422);
    }
}
