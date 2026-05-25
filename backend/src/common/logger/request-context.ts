import { Request } from 'express';
import { LogContext } from './types';

export function logContextFromRequest(req: Request, module: string, extra?: LogContext): LogContext {
    return {
        requestId: req.requestId ?? (req.headers['x-request-id'] as string | undefined),
        userId: req.user?.employeeId,
        route: req.originalUrl,
        role: req.user?.role,
        module,
        ...extra,
    };
}
