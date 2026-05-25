import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { errorHandler } from './common/middleware/error.middleware';
import { env } from './config/env';
import { structuredLogger } from './common/logger';
import { requestIdMiddleware } from './common/middleware/request-id';
import { logContextFromRequest } from './common/logger/request-context';
import { createRateLimiter, skipHealthProbes } from './common/middleware/rate-limit';
import { employeeRouter } from './modules/employees/employee.routes';
import { projectRouter } from './modules/projects/project.routes';
import { allocationRouter } from './modules/allocations/allocation.routes';
import { timeEntryRouter } from './modules/time-entries/time-entry.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { roleRouter } from './modules/roles/role.routes';
import { skillRouter } from './modules/skills/skill.routes';
import { okrRouter } from './modules/okrs/okr.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { authRouter } from './modules/auth/auth.routes';
import reportsRouter from './modules/reports/reports.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { searchRouter } from './modules/search/search.routes';
import { systemRouter } from './modules/system/system.routes';

import './modules/skills/skill.model';
import './modules/roles/role.model';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const frontendOrigin = env.FRONTEND_URL.replace(/\/$/, '');

const allowedOrigins =
    env.NODE_ENV === 'production'
        ? [frontendOrigin]
        : [
              'http://localhost:5173',
              'http://localhost:3000',
              'http://127.0.0.1:5173',
              frontendOrigin,
          ];

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                connectSrc: ["'self'", ...allowedOrigins],
            },
        },
        frameguard: { action: 'deny' },
        noSniff: true,
    })
);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            if (env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-user-role'],
    })
);

app.use(express.json());
app.use(mongoSanitize());

app.use(requestIdMiddleware);

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        structuredLogger.info(`${req.method} ${req.originalUrl}`, {
            ...logContextFromRequest(req, 'http'),
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
        });
    });
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date(),
        env: env.NODE_ENV,
    });
});

app.get('/ready', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'ready' : 'unavailable',
        db: isDbConnected ? 'connected' : 'disconnected',
    });
});

const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    skip: skipHealthProbes,
});
app.use(globalLimiter);

const authLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
});

const reportsLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
});

app.use('/api/employees', employeeRouter);
app.use('/api/projects', projectRouter);
app.use('/api/allocations', allocationRouter);
app.use('/api/time-entries', timeEntryRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/roles', roleRouter);
app.use('/api/skills', skillRouter);
app.use('/api/okrs', okrRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/reports', reportsLimiter, reportsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/search', searchRouter);
app.use('/api/system', systemRouter);

app.use(errorHandler);

export { app };
