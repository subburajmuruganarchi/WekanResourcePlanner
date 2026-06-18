import { AppError } from '../../common/errors/app-error';
import { structuredLogger } from '../../common/logger';
import { Employee } from '../employees/employee.model';
import { Project } from '../projects/project.model';
import { SyncBatch } from './sync-batch.model';
import { SyncRun } from './sync-run.model';

export type SupportedSheet = 'Resource' | 'Project' | 'Project_Allocation';

const BATCH_WAIT_POLL_MS = 2_000;
const BATCH_WAIT_TIMEOUT_MS = 120_000;

const SHEET_ORDER: SupportedSheet[] = ['Resource', 'Project', 'Project_Allocation'];

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type BatchCompletionFlag = 'resourceCompleted' | 'projectCompleted' | 'allocationCompleted';

const SHEET_TO_FLAG: Record<SupportedSheet, BatchCompletionFlag> = {
    Resource: 'resourceCompleted',
    Project: 'projectCompleted',
    Project_Allocation: 'allocationCompleted',
};

const PREREQUISITE_FLAGS: Partial<Record<SupportedSheet, BatchCompletionFlag[]>> = {
    Project: ['resourceCompleted'],
    Project_Allocation: ['resourceCompleted', 'projectCompleted'],
};

/** Create batch record when GAS sends batchId before UI full-sync job creates it. */
export async function ensureSyncBatch(batchId: string, requestId: string): Promise<void> {
    const res = await SyncBatch.updateOne(
        { batchId },
        {
            $setOnInsert: {
                batchId,
                status: 'RUNNING',
                startedAt: new Date(),
                triggeredBy: 'SYSTEM',
                requestId,
                progress: 0,
                sheets: SHEET_ORDER.map((sheet) => ({ sheet, status: 'PENDING' })),
                failureMessages: [],
                resourceCompleted: false,
                projectCompleted: false,
                allocationCompleted: false,
            },
        },
        { upsert: true }
    );

    if (res.upsertedCount === 1) {
        structuredLogger.info('START SYNC BATCH', { requestId, syncBatchId: batchId });
    }
}

export async function markBatchSheetCompleted(
    batchId: string,
    sheet: SupportedSheet,
    received: number,
    processed: number
): Promise<void> {
    const flag = SHEET_TO_FLAG[sheet];
    const logEvent =
        sheet === 'Resource'
            ? 'SYNC RESOURCE COMPLETED'
            : sheet === 'Project'
              ? 'SYNC PROJECT COMPLETED'
              : 'SYNC ALLOCATION COMPLETED';

    await SyncBatch.updateOne(
        { batchId },
        {
            $set: {
                [flag]: true,
                currentSheet: sheet,
                progress:
                    sheet === 'Resource' ? 33 : sheet === 'Project' ? 66 : 100,
            },
        }
    );
    await SyncBatch.updateOne(
        { batchId, 'sheets.sheet': sheet },
        {
            $set: {
                'sheets.$.status': 'SUCCESS',
                'sheets.$.rowsReceived': received,
                'sheets.$.rowsProcessed': processed,
            },
        }
    );

    structuredLogger.info(logEvent, {
        syncBatchId: batchId,
        sheet,
        rowsReceived: received,
        rowsProcessed: processed,
    });
}

async function isBatchFlagComplete(batchId: string, flag: BatchCompletionFlag): Promise<boolean> {
    const batch = await SyncBatch.findOne({ batchId }).select(flag).lean();
    if (batch?.[flag] === true) return true;

    const sheet =
        flag === 'resourceCompleted'
            ? 'Resource'
            : flag === 'projectCompleted'
              ? 'Project'
              : 'Project_Allocation';

    const run = await SyncRun.findOne({
        syncBatchId: batchId,
        sheet,
        status: 'SUCCESS',
    }).lean();

    return !!run;
}

async function waitForBatchFlags(
    batchId: string,
    flags: BatchCompletionFlag[],
    requestId: string,
    waitingForLabel: string
): Promise<void> {
    const deadline = Date.now() + BATCH_WAIT_TIMEOUT_MS;

    while (Date.now() < deadline) {
        const batch = await SyncBatch.findOne({ batchId }).select('status').lean();
        if (batch?.status === 'FAILED') {
            throw new AppError(
                `Sync batch ${batchId} failed before ${waitingForLabel} completed`,
                422
            );
        }

        const results = await Promise.all(flags.map((f) => isBatchFlagComplete(batchId, f)));
        if (results.every(Boolean)) return;

        await sleep(BATCH_WAIT_POLL_MS);
    }

    throw new AppError(
        `Timed out after ${BATCH_WAIT_TIMEOUT_MS / 1000}s waiting for ${waitingForLabel} in batch ${batchId}`,
        504
    );
}

async function assertGlobalAllocationDependencies(): Promise<void> {
    const [employeeCount, projectCount] = await Promise.all([
        Employee.countDocuments({ is_active: { $ne: false } }),
        Project.countDocuments({ is_active: { $ne: false } }),
    ]);

    if (employeeCount === 0) {
        throw new AppError(
            'Allocation sync requires Resource data. Sync Resource sheet first.',
            422
        );
    }
    if (projectCount === 0) {
        throw new AppError('Allocation sync requires Project data. Sync Project sheet first.', 422);
    }
}

/**
 * Batch-aware prerequisite gate.
 * - With syncBatchId: poll until prior sheets in the batch complete (cross-instance safe).
 * - Without syncBatchId (manual Flow A): immediate global MongoDB check.
 */
export async function waitForSheetPrerequisites(
    sheet: SupportedSheet,
    syncBatchId: string | undefined,
    requestId: string
): Promise<void> {
    const requiredFlags = PREREQUISITE_FLAGS[sheet];
    if (!requiredFlags?.length) return;

    if (!syncBatchId) {
        if (sheet === 'Project_Allocation') {
            await assertGlobalAllocationDependencies();
        }
        return;
    }

    await ensureSyncBatch(syncBatchId, requestId);

    if (sheet === 'Project_Allocation') {
        structuredLogger.info('WAITING FOR PROJECT BEFORE ALLOCATION', {
            requestId,
            syncBatchId,
        });
    }

    const waitingFor =
        sheet === 'Project_Allocation'
            ? 'Project'
            : requiredFlags.includes('resourceCompleted')
              ? 'Resource'
              : 'prior sheets';

    await waitForBatchFlags(syncBatchId, requiredFlags, requestId, waitingFor);

    if (sheet === 'Project_Allocation') {
        await assertGlobalAllocationDependencies();
    }
}
