import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';
import { logger } from './common/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectWithRetry = async (retries: number = MAX_RETRIES): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`MongoDB connection attempt ${attempt}/${retries}...`);
            await mongoose.connect(env.MONGO_URI);
            logger.info('Connected to MongoDB');
            return;
        } catch (error) {
            logger.error(`MongoDB connection attempt ${attempt} failed:`, error);
            if (attempt < retries) {
                const delay = RETRY_DELAY_MS * attempt;
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`Failed to connect to MongoDB after ${retries} attempts`);
};

// Handle Uncaught Exceptions globally
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', { error: err.stack || err });
    process.exit(1);
});

// Handle Unhandled Promise Rejections globally
process.on('unhandledRejection', (reason) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', { error: reason });
    process.exit(1);
});

const startServer = async () => {
    try {
        // Connect to MongoDB with retry
        await connectWithRetry();

        // Start Server
        const server = app.listen(env.PORT, '0.0.0.0', () => {
            logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode securely bound to 0.0.0.0`);
        });

        // Graceful Shutdown
        let isShuttingDown = false;
        const shutdown = async (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            
            logger.info(`${signal} received. Shutting down server gracefully...`);
            
            server.close(async (err) => {
                if (err) {
                    logger.error('Error during HTTP server closure', { error: err });
                } else {
                    logger.info('HTTP server closed (connections drained).');
                }

                try {
                    await mongoose.connection.close(false);
                    logger.info('MongoDB connection closed.');
                    process.exit(err ? 1 : 0);
                } catch (dbErr) {
                    logger.error('Error during MongoDB disconnection', { error: dbErr });
                    process.exit(1);
                }
            });

            // Force shutdown if it takes longer than 10 seconds
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

