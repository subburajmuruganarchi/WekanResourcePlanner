import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './common/middleware/error.middleware';
import { env } from './config/env';
import { employeeRouter } from './modules/employees/employee.routes';

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

// Global Error Handler
app.use(errorHandler);

export { app };
