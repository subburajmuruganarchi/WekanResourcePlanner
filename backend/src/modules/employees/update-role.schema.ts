import { z } from 'zod';

export const UpdateEmployeeRoleSchema = z.object({
    role_id: z.string().min(1, 'Role ID is required'),
    is_active: z.boolean().optional(),
});

export type UpdateEmployeeRoleInput = z.infer<typeof UpdateEmployeeRoleSchema>;
