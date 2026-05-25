import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoUriPattern = /^mongodb(\+srv)?:\/\/.+/;

function resolveMongoUri(): string | undefined {
    const uri = process.env.MONGO_URI?.trim() || process.env.DATABASE_URL?.trim();
    return uri || undefined;
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
        .string()
        .optional()
        .default('3000')
        .transform((val) => parseInt(val, 10)),
    MONGO_URI: z
        .string({
            required_error: 'MONGO_URI (or DATABASE_URL) is required',
            invalid_type_error: 'MONGO_URI must be a string',
        })
        .min(1, 'MONGO_URI (or DATABASE_URL) is required')
        .refine((val) => mongoUriPattern.test(val), {
            message:
                'MONGO_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)',
        }),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    JWT_SECRET: z
        .string({
            required_error: 'JWT_SECRET is required',
        })
        .min(32, 'JWT_SECRET must be at least 32 characters long'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    FRONTEND_URL: z
        .string({
            required_error: 'FRONTEND_URL is required for CORS',
        })
        .url('FRONTEND_URL must be a valid URL (e.g. https://app.example.com)'),
});

const parsedEnv = envSchema.safeParse({
    ...process.env,
    MONGO_URI: resolveMongoUri(),
});

if (!parsedEnv.success) {
    console.error('R360 startup aborted: invalid environment configuration\n');
    for (const issue of parsedEnv.error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : 'environment';
        console.error(`  - ${field}: ${issue.message}`);
    }
    console.error('\nSee backend/.env.example for required variables.');
    process.exit(1);
}

export const env = parsedEnv.data;
