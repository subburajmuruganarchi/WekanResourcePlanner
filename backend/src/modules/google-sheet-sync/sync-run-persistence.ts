import { ISyncRun, SyncRun } from './sync-run.model';
import { Types } from 'mongoose';
import { unwrapImportError } from '../../services/planner-import/import-error.utils';
import { structuredLogger } from '../../common/logger';

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
        rowsProcessed: number;
        rowsSkipped: number;
        skippedRows?: ISyncRun['skippedRows'];
    }
): Promise<void> {
    await SyncRun.findByIdAndUpdate(runId, {
        completedAt: new Date(),
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
    const run = await SyncRun.findByIdAndUpdate(
        runId,
        {
            completedAt: new Date(),
            status: 'FAILED',
            errorMessage: message,
            errorStack: stack ?? null,
            errorMessages: [message],
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
    });

    return { message, stack, code, codeName, errmsg };
}
