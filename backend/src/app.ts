import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './common/middleware/error.middleware';
import { env } from './config/env';
import { employeeRouter } from './modules/employees/employee.routes';
import { projectRouter } from './modules/projects/project.routes';
import { allocationRouter } from './modules/allocations/allocation.routes';
import { timeEntryRouter } from './modules/time-entries/time-entry.routes';

// Import models to register schemas with Mongoose (required for populate)
import './modules/skills/skill.model';
import './modules/roles/role.model';

const app = express();

// Global Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date(), env: env.NODE_ENV });
});

// Register Routes
app.use('/api/employees', employeeRouter);
app.use('/api/projects', projectRouter);
app.use('/api/allocations', allocationRouter);
app.use('/api/time-entries', timeEntryRouter);

// Global Error Handler
app.use(errorHandler);

export { app };
