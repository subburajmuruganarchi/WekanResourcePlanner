import { z } from 'zod';
import { MAX_GRID_WEEK_SPAN } from '../../common/utils/week.util';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

export const utilizationRangeQuerySchema = z
    .object({
        weekStartFrom: isoDateSchema,
        weekStartTo: isoDateSchema,
        employeeId: objectIdSchema.optional(),
        projectId: objectIdSchema.optional(),
    })
    .superRefine((data, ctx) => {
        const from = new Date(data.weekStartFrom);
        const to = new Date(data.weekStartTo);
        if (to < from) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'weekStartTo must be on or after weekStartFrom',
                path: ['weekStartTo'],
            });
        }
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weeks = Math.floor((to.getTime() - from.getTime()) / msPerWeek) + 1;
        if (weeks > MAX_GRID_WEEK_SPAN) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Week range cannot exceed ${MAX_GRID_WEEK_SPAN} weeks`,
                path: ['weekStartTo'],
            });
        }
    });

export const utilizationSyncBodySchema = z.object({
    weekStartFrom: isoDateSchema,
    weekStartTo: isoDateSchema,
    employeeId: objectIdSchema.optional(),
    projectId: objectIdSchema.optional(),
});
