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
    /** Shared secret for Google Apps Script → POST /api/google-sheet-sync/webhook */
    GOOGLE_SHEET_SYNC_SECRET: z.string().min(16).optional(),
    /** Optional Google Sheet document id for future pull-based sync */
    GOOGLE_SHEET_ID: z.string().optional(),
    /** Google Apps Script web app URL — Admin "Full Sync" triggers POST {} here */
    GOOGLE_APPS_SCRIPT_WEB_APP_URL: z.string().url().optional(),
    FRONTEND_URL: z
        .string({
            required_error: 'FRONTEND_URL is required for CORS',
        })
        .url('FRONTEND_URL must be a valid URL (e.g. https://app.example.com)'),
    /** Phase 1 weekly planning APIs (default off for safe rollout). */
    FEATURE_WEEKLY_ALLOCATIONS_ENABLED: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .default('false')
        .transform((v) => v === 'true' || v === '1'),
    /** When true, grid reads merge legacy project_allocations into planned hours. */
    FEATURE_WEEKLY_ALLOCATIONS_LEGACY_READ: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .default('true')
        .transform((v) => v === 'true' || v === '1'),
    /** When true, PUT /grid enforces 40h/week capacity unless admin override. */
    FEATURE_WEEKLY_ALLOCATIONS_VALIDATE_CAPACITY: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .default('true')
        .transform((v) => v === 'true' || v === '1'),
    /** Standard hours per employee per week (enterprise default 40). */
    WEEKLY_CAPACITY_HOURS: z
        .string()
        .optional()
        .default('40')
        .transform((v) => {
            const n = parseInt(v, 10);
            return Number.isFinite(n) && n > 0 && n <= 168 ? n : 40;
        }),
    FEATURE_UTILIZATION_API_ENABLED: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .default('true')
        .transform((v) => v === 'true' || v === '1'),
    /** Auto-sync actual_hours from PM-approved time entries on approval + manual sync API. */
    FEATURE_WEEKLY_ACTUALS_SYNC_ENABLED: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .default('true')
        .transform((v) => v === 'true' || v === '1'),
    FEATURE_WEEKLY_UTILIZATION_SNAPSHOTS: z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .default('true')
        .transform((v) => v === 'true' || v === '1'),
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
