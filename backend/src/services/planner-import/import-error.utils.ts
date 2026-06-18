export interface UnwrappedImportError {
    message: string;
    stack?: string;
    code?: number | string;
    codeName?: string;
    errmsg?: string;
}

const ABORTED_TXN_RE =
    /transaction.*aborted|txnNumber|TransientTransactionError|UnknownTransactionCommitResult/i;

type MongoLikeError = Error & {
    cause?: unknown;
    reason?: unknown;
    errorResponse?: { errmsg?: string; code?: number; codeName?: string };
    writeErrors?: Array<{ errmsg?: string; code?: number; codeName?: string; index?: number }>;
    code?: number | string;
    codeName?: string;
    errmsg?: string;
};

function fromWriteErrors(err: MongoLikeError): UnwrappedImportError | null {
    const first = err.writeErrors?.[0];
    if (!first?.errmsg) return null;
    return {
        message: first.errmsg,
        stack: err.stack,
        code: first.code,
        codeName: first.codeName,
        errmsg: first.errmsg,
    };
}

/**
 * Unwrap MongoDB/Mongoose transaction wrapper errors to surface the root cause.
 */
export function unwrapImportError(err: unknown, depth = 0): UnwrappedImportError {
    if (depth > 8) {
        return { message: 'Import failed (error unwrap depth exceeded)' };
    }

    if (!err || typeof err !== 'object') {
        return { message: String(err) };
    }

    const e = err as MongoLikeError;

    const fromBulk = fromWriteErrors(e);
    if (fromBulk) return fromBulk;

    if (e.errorResponse?.errmsg) {
        return {
            message: e.errorResponse.errmsg,
            stack: e.stack,
            code: e.errorResponse.code,
            codeName: e.errorResponse.codeName,
            errmsg: e.errorResponse.errmsg,
        };
    }

    if (e.errmsg && typeof e.errmsg === 'string') {
        return {
            message: e.errmsg,
            stack: e.stack,
            code: e.code,
            codeName: e.codeName,
            errmsg: e.errmsg,
        };
    }

    if (e.cause) {
        const inner = unwrapImportError(e.cause, depth + 1);
        if (ABORTED_TXN_RE.test(e.message ?? '') && inner.message !== e.message) {
            return inner;
        }
    }

    if (e.reason) {
        const inner = unwrapImportError(e.reason, depth + 1);
        if (ABORTED_TXN_RE.test(e.message ?? '')) {
            return inner;
        }
    }

    const message = e.message || String(err);
    if (ABORTED_TXN_RE.test(message)) {
        return {
            message:
                'MongoDB transaction aborted (likely exceeded time limit or a prior write failed). ' +
                'Inspect nested writeErrors/cause in logs.',
            stack: e.stack,
            code: e.code,
            codeName: e.codeName,
            errmsg: message,
        };
    }

    return {
        message,
        stack: e.stack,
        code: e.code,
        codeName: e.codeName,
        errmsg: e.errmsg,
    };
}

export function toError(unwrapped: UnwrappedImportError): Error {
    const err = new Error(unwrapped.message);
    if (unwrapped.stack) err.stack = unwrapped.stack;
    return err;
}
