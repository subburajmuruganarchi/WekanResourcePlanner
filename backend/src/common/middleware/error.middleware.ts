import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { structuredLogger } from '../logger';
import { logContextFromRequest } from '../logger/request-context';
import { ZodError } from 'zod';

function attachRequestId(req: Request, body: Record<string, unknown>): Record<string, unknown> {
    const requestId = req.requestId ?? (req.headers['x-request-id'] as string | undefined);
    return requestId ? { ...body, requestId } : body;
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    const ctx = logContextFromRequest(req, 'error-handler');

    if (err instanceof AppError) {
        if (err.isOperational) {
            structuredLogger.warn(err.message, { ...ctx, statusCode: err.statusCode });
        } else {
            structuredLogger.error('System Error', { ...ctx, error: err.message });
        }
        return res.status(err.statusCode).json(
            attachRequestId(req, {
                status: 'error',
                message: err.message,
            })
        );
    }

    if (err instanceof ZodError) {
        structuredLogger.warn('Validation Error', { ...ctx, errors: err.errors });
        return res.status(400).json(
            attachRequestId(req, {
                status: 'fail',
                message: 'Validation Error',
                errors: err.errors,
            })
        );
    }

    structuredLogger.error('Unhandled Exception', {
        ...ctx,
        error: err.stack ?? err.message,
    });
    res.status(500).json(
        attachRequestId(req, {
            status: 'error',
            message: 'Internal Server Error',
        })
    );
};
