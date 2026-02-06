import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../logger';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        if (err.isOperational) {
            logger.warn(err.message, { statusCode: err.statusCode, url: req.originalUrl });
        } else {
            logger.error('System Error', { error: err });
        }
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    // Handle Zod Validation Errors
    if (err instanceof ZodError) {
        logger.warn('Validation Error', { errors: err.errors });
        return res.status(400).json({
            status: 'fail',
            message: 'Validation Error',
            errors: err.errors,
        });
    }

    // Handle Mongoose/CastError if needed specifically, otherwise fallback

    // Fallback for unhandled errors
    logger.error('Unhandled Exception', { error: err.stack, url: req.originalUrl });
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
    });
};
