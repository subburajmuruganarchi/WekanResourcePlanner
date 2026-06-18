import { ClientSession } from 'mongoose';

export interface ImportWriteOptions {
    session?: ClientSession;
    /** Abort entire batch on first write failure (requires MongoDB transaction). */
    atomic?: boolean;
    /** When true, skip stale-record deactivation (runs after transaction commits). */
    deferStaleCleanup?: boolean;
    /** When true, skip junk-skill cleanup (runs after transaction commits). */
    deferJunkSkillCleanup?: boolean;
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

/** Chunk size for bulkWrite inside transactions. */
export const IMPORT_BULK_CHUNK_SIZE = 500;
