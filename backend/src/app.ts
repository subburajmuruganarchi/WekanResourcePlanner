import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './common/middleware/error.middleware';
import { env } from './config/env';

// Import Routes (Placeholder)
// import { healthRouter } from './modules/health/health.routes';

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
// app.use('/api/v1/projects', projectRouter);

// Global Error Handler
app.use(errorHandler);

export { app };
