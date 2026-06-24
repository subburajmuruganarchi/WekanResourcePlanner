import { z } from 'zod';

export const createPortfolioSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    projectIds: z.array(z.string()).default([]),
    managerIds: z.array(z.string()).default([]),
});

export const updatePortfolioSchema = createPortfolioSchema.partial();

export const assignDeliveryManagerSchema = z.object({
    projectId: z.string().min(1),
    managerId: z.string().min(1),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
export type AssignDeliveryManagerInput = z.infer<typeof assignDeliveryManagerSchema>;
