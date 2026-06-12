import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assigns correlation id to each request and exposes it on responses.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId =
        typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : uuidv4();

    req.requestId = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const originalJson = res.json.bind(res);
    res.json = function jsonWithRequestId(body?: unknown) {
        if (body && typeof body === 'object' && !Array.isArray(body)) {
            const payload = body as Record<string, unknown>;
            if (payload.requestId === undefined) {
                payload.requestId = requestId;
            }
        }
        return originalJson(body);
    };

    next();
}
