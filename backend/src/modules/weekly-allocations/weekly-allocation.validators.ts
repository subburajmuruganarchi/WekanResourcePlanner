import { z } from 'zod';
import { WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';
import { MAX_GRID_WEEK_SPAN } from '../../common/utils/week.util';

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const objectIdSchema = z.string().regex(objectIdPattern, 'Invalid ObjectId');

const isoDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Expected ISO date (YYYY-MM-DD)');

const hoursSchema = z.number().min(0).max(168);

export const weeklyGridQuerySchema = z
    .object({
        weekStartFrom: isoDateSchema,
        weekStartTo: isoDateSchema,
        employeeId: objectIdSchema.optional(),
        employeeIds: z.string().optional(),
        projectId: objectIdSchema.optional(),
        projectIds: z.string().optional(),
        page: z.coerce.number().int().min(1).optional().default(1),
        limit: z.coerce.number().int().min(1).max(500).optional().default(50),
        includeCapacitySummary: z
            .enum(['true', 'false', '1', '0'])
            .optional()
            .default('false')
            .transform((v) => v === 'true' || v === '1'),
    })
    .superRefine((data, ctx) => {
        const from = new Date(data.weekStartFrom);
        const to = new Date(data.weekStartTo);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid week range dates',
                path: ['weekStartFrom'],
            });
            return;
        }
        if (to < from) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'weekStartTo must be on or after weekStartFrom',
                path: ['weekStartTo'],
            });
        }
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekCount = Math.floor((to.getTime() - from.getTime()) / msPerWeek) + 1;
        if (weekCount > MAX_GRID_WEEK_SPAN) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Week range cannot exceed ${MAX_GRID_WEEK_SPAN} weeks`,
                path: ['weekStartTo'],
            });
        }
    });

export const weeklyGridUpdateItemSchema = z.object({
    employeeId: objectIdSchema,
    projectId: objectIdSchema,
    weekStart: isoDateSchema,
    plannedHours: hoursSchema.optional(),
    actualHours: hoursSchema.optional(),
    forecastHours: hoursSchema.optional(),
    allocationId: objectIdSchema.optional(),
    source: z.nativeEnum(WeeklyAllocationSource).optional(),
    status: z.nativeEnum(WeeklyAllocationStatus).optional(),
});

export const weeklyGridPutBodySchema = z.object({
    updates: z.array(weeklyGridUpdateItemSchema).min(1).max(500),
    validateCapacity: z.boolean().optional(),
    allowOverAllocation: z.boolean().optional(),
});

export type WeeklyGridQueryInput = z.infer<typeof weeklyGridQuerySchema>;
export type WeeklyGridPutBodyInput = z.infer<typeof weeklyGridPutBodySchema>;

export function parseIdList(csv?: string): string[] | undefined {
    if (!csv?.trim()) return undefined;
    const ids = csv.split(',').map((s) => s.trim()).filter(Boolean);
    for (const id of ids) {
        if (!objectIdPattern.test(id)) {
            throw new Error(`Invalid id in list: ${id}`);
        }
    }
    return ids.length > 0 ? ids : undefined;
}
