import { z } from 'zod';
import { ProjectStatus, ProjectPriority, SkillLevel, BillingType, DeliveryModel, StaffingStrategy } from '../../common/types/enums';

// Validation schema for project creation (snake_case to match resource-360 database)
export const CreateProjectSchema = z.object({
    project_name: z.string().min(1, 'Project name is required'),
    project_code: z.string().min(1, 'Project code is required').toUpperCase(),
    project_owner_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Owner ID').optional(),
    project_manager_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Project Manager ID'),
    status: z.nativeEnum(ProjectStatus).optional().default(ProjectStatus.ACTIVE),
    priority: z.nativeEnum(ProjectPriority),
    start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid Date Format')),
    end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid Date Format')),
    billing_type: z.nativeEnum(BillingType).optional(),
    delivery_model: z.nativeEnum(DeliveryModel).optional(),
    project_logo: z.string().optional(),
    projected_total_hours: z.number().optional(),
    business_goal: z.string().optional(),
    staffing_strategy: z.nativeEnum(StaffingStrategy).optional()
}).refine(data => {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return start <= end;
}, {
    message: 'Start date must be before or equal to end date',
    path: ['end_date']
});

// Skill requirement schema for separate collection
export const SkillRequirementSchema = z.object({
    project_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Project ID'),
    skill_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Skill ID'),
    min_skill_level: z.nativeEnum(SkillLevel).optional().default(SkillLevel.INTERMEDIATE),
    required_headcount: z.number().int().min(1, 'Headcount must be at least 1'),
    required_days: z.number().int().min(1, 'Days must be at least 1'),
    role_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID').optional()
});

// Role effort schema for separate collection
export const RoleEffortSchema = z.object({
    project_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Project ID'),
    role_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID'),
    required_headcount: z.number().int().min(1, 'Headcount must be at least 1'),
    required_days: z.number().int().min(1, 'Days must be at least 1'),
    hours_per_day: z.number().min(0.5, 'Hours per day must be at least 0.5')
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type SkillRequirementInput = z.infer<typeof SkillRequirementSchema>;
export type RoleEffortInput = z.infer<typeof RoleEffortSchema>;
