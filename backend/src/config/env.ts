import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
    MONGO_URI: z.string().url(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('Invalid environment variables:', parsedEnv.error.format());
    process.exit(1);
}

export const env = parsedEnv.data;
