import { ClientSession } from 'mongoose';

export interface ImportWriteOptions {
    session?: ClientSession;
    /** Abort entire batch on first write failure (requires MongoDB transaction). */
    atomic?: boolean;
}

export function mongooseSessionOpts(writeOpts?: ImportWriteOptions): { session?: ClientSession } {
    return writeOpts?.session ? { session: writeOpts.session } : {};
}

/** In atomic mode any skipped row aborts the transaction; otherwise accumulate skips. */
export function failOrSkipRow(
    writeOpts: ImportWriteOptions | undefined,
    skippedRows: { identifier: string; reason: string }[],
    identifier: string,
    reason: string
): void {
    if (writeOpts?.atomic) {
        throw new Error(`${identifier}: ${reason}`);
    }
    skippedRows.push({ identifier, reason });
}
