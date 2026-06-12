import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

const SYNC_KEY_HEADER = 'x-r360-sync-key';

export function requireSyncKey(req: Request, res: Response, next: NextFunction): void {
    const secret = env.GOOGLE_SHEET_SYNC_SECRET;
    if (!secret) {
        res.status(503).json({
            status: 'error',
            message: 'Google Sheet sync is not configured (GOOGLE_SHEET_SYNC_SECRET missing).',
        });
        return;
    }

    const provided = req.headers[SYNC_KEY_HEADER] ?? req.headers[SYNC_KEY_HEADER.toUpperCase()];
    const key = Array.isArray(provided) ? provided[0] : provided;

    if (!key || key !== secret) {
        res.status(401).json({
            status: 'error',
            message: 'Invalid or missing sync key.',
        });
        return;
    }

    next();
}
