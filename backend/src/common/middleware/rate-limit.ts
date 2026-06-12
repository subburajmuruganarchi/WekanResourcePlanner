import { Request, Response } from 'express';
import rateLimit, { Options } from 'express-rate-limit';

/** Standard 429 JSON for rate-limited requests. */
export function rateLimitJsonHandler(
    req: Request,
    res: Response
): void {
    res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        requestId: req.requestId,
    });
}

export function createRateLimiter(options: Partial<Options>): ReturnType<typeof rateLimit> {
    return rateLimit({
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitJsonHandler,
        ...options,
    });
}

/** Probe endpoints — no throttling */
export function skipHealthProbes(req: Request): boolean {
    return req.path === '/health' || req.path === '/ready';
}
