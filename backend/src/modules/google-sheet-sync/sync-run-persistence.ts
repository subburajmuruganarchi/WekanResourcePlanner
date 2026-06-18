import { ISyncRun, SyncRun } from './sync-run.model';
import { Types } from 'mongoose';
import { unwrapImportError } from '../../services/planner-import/import-error.utils';
import { structuredLogger } from '../../common/logger';
import { ResourceValidationError } from '../../services/planner-import/resource-row.validation';

export interface SyncRunFailureDetails {
    message: string;
    stack?: string;
    rootCause?: string;
    code?: number | string;
    codeName?: string;
    errmsg?: string;
}

export function extractFailureDetails(err: unknown): SyncRunFailureDetails {
    const unwrapped = unwrapImportError(err);
    return {
        message: unwrapped.message,
        stack: unwrapped.stack,
        code: unwrapped.code,
        codeName: unwrapped.codeName,
        errmsg: unwrapped.errmsg,
        rootCause: unwrapped.codeName
            ? `${unwrapped.codeName}${unwrapped.code != null ? ` (${unwrapped.code})` : ''}`
            : undefined,
    };
}

export async function persistSyncRunSuccess(
    runId: Types.ObjectId | string,
    fields: {
        rowsReceived: number;
        rowsProcessed: number;
        rowsSkipped: number;
        skippedRows?: ISyncRun['skippedRows'];
    }
): Promise<void> {
    await SyncRun.findByIdAndUpdate(runId, {
        completedAt: new Date(),
        rowsReceived: fields.rowsReceived,
        rowsProcessed: fields.rowsProcessed,
        rowsSkipped: fields.rowsSkipped,
        skippedRows: fields.skippedRows,
        errorMessages: [],
        errorMessage: null,
        errorStack: null,
        status: 'SUCCESS',
    });
}

export async function persistSyncRunFailure(
    runId: Types.ObjectId | string,
    err: unknown
): Promise<SyncRunFailureDetails> {
    const { message, stack, code, codeName, errmsg } = extractFailureDetails(err);
    const errorMessages =
        err instanceof ResourceValidationError
            ? err.errors
            : [message];

    const run = await SyncRun.findByIdAndUpdate(
        runId,
        {
            completedAt: new Date(),
            status: 'FAILED',
            errorMessage: message,
            errorStack: stack ?? null,
            errorMessages,
        },
        { new: true }
    ).lean();

    structuredLogger.error('SYNC_RUN_FAILED', {
        event: 'SYNC_RUN_FAILED',
        syncBatchId: run?.syncBatchId,
        syncId: run?.syncId,
        sheet: run?.sheet,
        errorMessage: message,
        errorStack: stack,
        code,
        codeName,
        errmsg,
        errors: errorMessages,
        validationReport:
            err instanceof ResourceValidationError ? err.validationReport : undefined,
    });

    return { message, stack, code, codeName, errmsg };
}
