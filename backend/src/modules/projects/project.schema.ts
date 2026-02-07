import { z } from 'zod';
import { ProjectStatus, ProjectPriority, BillingType, DeliveryModel, SkillLevel } from '../../common/types/enums';

// Sub-schemas
const SkillRequirementSchema = z.object({
    skillId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Skill ID'),
    minSkillLevel: z.nativeEnum(SkillLevel),
    requiredHeadcount: z.number().int().min(1, 'Headcount must be at least 1'),
    requiredDays: z.number().int().min(1, 'Days must be at least 1'),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID').optional()
});

const RoleEffortSchema = z.object({
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID'),
    requiredHeadcount: z.number().int().min(1, 'Headcount must be at least 1'),
    requiredDays: z.number().int().min(1, 'Days must be at least 1'),
    hoursPerDay: z.number().min(0.5, 'Hours per day must be at least 0.5').max(24)
});

// Main Create Project Schema
export const CreateProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required').trim(),
    code: z.string().min(1, 'Project code is required').trim().toUpperCase(),
    status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE),
    priority: z.nativeEnum(ProjectPriority),
    ownerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Owner ID'),
    startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid Date Format')),
    endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid Date Format')),
    billingType: z.nativeEnum(BillingType).optional(),
    deliveryModel: z.nativeEnum(DeliveryModel).optional(),
    skillRequirements: z.array(SkillRequirementSchema).min(1, 'At least one skill requirement is needed'),
    roleEfforts: z.array(RoleEffortSchema).optional()
}).refine(data => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
}, {
    message: "End date must be after or equal to start date",
    path: ["endDate"]
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
