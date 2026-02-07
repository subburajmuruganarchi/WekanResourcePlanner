import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from './common/middleware/error.middleware';
import { env } from './config/env';
import { logger } from './common/logger';
import { employeeRouter } from './modules/employees/employee.routes';
import { projectRouter } from './modules/projects/project.routes';
import { allocationRouter } from './modules/allocations/allocation.routes';
import { timeEntryRouter } from './modules/time-entries/time-entry.routes';
import { roleRouter } from './modules/roles/role.routes';
import { skillRouter } from './modules/skills/skill.routes';

// Import models to register schemas with Mongoose (required for populate)
import './modules/skills/skill.model';
import './modules/roles/role.model';

const app = express();

// Global Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "http://localhost:5173", "http://localhost:3000"],
        }
    }
}));
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));
app.use(express.json());

// Request Correlation ID
app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    // make it available in response
    res.setHeader('x-request-id', requestId);
    next();
});

// Request Logger (Minimal)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl}`, {
            requestId: req.headers['x-request-id'],
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });
    next();
});

// Health Check
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const status = dbStatus === 'connected' ? 'ok' : 'error';
    const code = dbStatus === 'connected' ? 200 : 503;

    res.status(code).json({
        status,
        timestamp: new Date(),
        env: env.NODE_ENV,
        db: dbStatus
    });
});

// Register Routes
app.use('/api/employees', employeeRouter);
app.use('/api/projects', projectRouter);
app.use('/api/allocations', allocationRouter);
app.use('/api/time-entries', timeEntryRouter);
app.use('/api/roles', roleRouter);
app.use('/api/skills', skillRouter);

// Global Error Handler
app.use(errorHandler);

export { app };
