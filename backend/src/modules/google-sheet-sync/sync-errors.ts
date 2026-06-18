import { AppError } from '../../common/errors/app-error';

/** Thrown when FULL_SYNC lock is already held (HTTP 409). */
export class SyncInProgressError extends AppError {
    readonly activeSyncBatchId?: string;

    constructor(message: string, activeSyncBatchId?: string) {
        super(message, 409);
        this.activeSyncBatchId = activeSyncBatchId;
    }
}
