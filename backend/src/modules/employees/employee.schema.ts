import { z } from 'zod';
import { EmployeeStatus, SkillType, SkillLevel, EmployeeRole, EmployeeDepartment } from '../../common/types/enums';

export const CreateEmployeeSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    employeeCode: z.string().min(1, 'Employee code is required').toUpperCase(),
    status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID'),
    department: z.nativeEnum(EmployeeDepartment).optional(),
    designation: z.nativeEnum(EmployeeRole).optional(),
    skills: z.array(z.object({
        skillId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Skill ID'),
        skillType: z.nativeEnum(SkillType),
        level: z.nativeEnum(SkillLevel),
        experienceYears: z.number().min(0).optional()
    })).min(1, 'At least one skill is required'),
    maxAllocationPercent: z.number().min(1).max(100).optional().default(100),
    joiningDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    exitDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

// Update schema: all fields optional, prevents arbitrary field injection
export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>;
