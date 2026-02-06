import mongoose from 'mongoose';
import { app } from './app';
import { env } from './config/env';
import { logger } from './common/logger';

const startServer = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(env.MONGO_URI);
        logger.info('Connected to MongoDB');

        // Start Server
        const server = app.listen(env.PORT, () => {
            logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
        });

        // Graceful Shutdown
        const shutdown = async () => {
            logger.info('Shutting down server...');
            server.close(() => {
                logger.info('HTTP server closed.');
                mongoose.connection.close(false).then(() => {
                    logger.info('MongoDB connection closed.');
                    process.exit(0);
                });
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
