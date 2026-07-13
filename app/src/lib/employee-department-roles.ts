import type { EmployeeDepartment, EmployeeRole } from '@/types/api';

/** Job roles available per department in Add/Edit Employee. */
export const ROLES_BY_DEPARTMENT: Record<EmployeeDepartment, EmployeeRole[]> = {
    Engineering: [
        'Architect',
        'Mobile Architect',
        'Associate Architect',
        'SDE III (Full Stack)',
        'SDE (Full Stack)',
        'SDE II (Full Stack)',
        'SDE (Backend)',
        'SDE II (Backend)',
        'SDE II (Frontend)',
        'SDE III (Mobile)',
        'SDE II (Mobile)',
        'DBA',
    ],
    'Human Resources': ['HR Manager', 'HR Executive'],
    'Product Management': ['Product Manager', 'Product Owner'],
    'Quality Assurance': ['QA Engineer', 'QA Lead'],
    Design: ['UX Designer', 'UI Designer'],
    'DevOps / Infrastructure': ['DevOps Engineer', 'Site Reliability Engineer'],
    'Data & Analytics': ['Data Analyst', 'Data Engineer'],
    Sales: ['Sales Executive', 'Account Manager'],
    Marketing: ['Marketing Manager', 'Marketing Specialist'],
    'Customer Support': ['Customer Support Specialist', 'Support Lead'],
    Finance: ['Finance Analyst', 'Accountant'],
    Operations: ['Operations Manager', 'Operations Coordinator'],
    Administration: ['Office Administrator', 'Executive Assistant'],
};

export function rolesForDepartment(department: EmployeeDepartment | ''): EmployeeRole[] {
    if (!department) return [];
    return ROLES_BY_DEPARTMENT[department] ?? [];
}
