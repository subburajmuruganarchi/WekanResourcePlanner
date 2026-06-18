import { ISyncRun, SyncRun } from './sync-run.model';
import { Types } from 'mongoose';

export interface SyncRunFailureDetails {
    message: string;
    stack?: string;
}

export function extractFailureDetails(err: unknown): SyncRunFailureDetails {
    if (err instanceof Error) {
        return { message: err.message, stack: err.stack };
    }
    return { message: String(err) };
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
    const { message, stack } = extractFailureDetails(err);
    await SyncRun.findByIdAndUpdate(runId, {
        completedAt: new Date(),
        status: 'FAILED',
        errorMessage: message,
        errorStack: stack ?? null,
        errorMessages: [message],
    });
    return { message, stack };
}
