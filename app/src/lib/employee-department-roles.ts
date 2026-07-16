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
    'Project Management': [
        'PMO Head',
        'Program Manager',
        'Senior Project Manager',
        'Project Manager',
        'Associate Project Manager',
        'Project Coordinator',
    ],
    'Delivery Management': [
        'Delivery Head',
        'Program Delivery Manager',
        'Senior Delivery Manager',
        'Delivery Manager',
        'Associate Delivery Manager',
        'Delivery Coordinator',
    ],
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

/** Departments whose job roles can be assigned as project resources. */
export const PROJECT_STAFFING_DEPARTMENTS: EmployeeDepartment[] = [
    'Engineering',
    'Quality Assurance',
    'Design',
    'DevOps / Infrastructure',
    'Data & Analytics',
];

/** Engineering + related delivery staffing job titles. */
export const PROJECT_STAFFING_ROLE_NAMES: ReadonlySet<string> = new Set(
    PROJECT_STAFFING_DEPARTMENTS.flatMap((dept) => ROLES_BY_DEPARTMENT[dept])
);

const NON_STAFFING_DEPARTMENTS: EmployeeDepartment[] = [
    'Human Resources',
    'Product Management',
    'Project Management',
    'Delivery Management',
    'Sales',
    'Marketing',
    'Customer Support',
    'Finance',
    'Operations',
    'Administration',
];

const NON_STAFFING_ROLE_NAMES: ReadonlySet<string> = new Set([
    'Admin',
    'Employee',
    'User',
    'CEO',
    'Project Manager',
    'Delivery Manager',
    ...NON_STAFFING_DEPARTMENTS.flatMap((dept) => ROLES_BY_DEPARTMENT[dept]),
]);

export function rolesForDepartment(department: EmployeeDepartment | ''): EmployeeRole[] {
    if (!department) return [];
    return ROLES_BY_DEPARTMENT[department] ?? [];
}

/**
 * Roles eligible in the project Resources picker.
 * Keeps engineering-family titles and imported tech roles; excludes PM/DM/HR/access roles.
 */
export function isProjectStaffingRoleName(name: string | undefined | null): boolean {
    if (!name) return false;
    const trimmed = name.trim();
    if (PROJECT_STAFFING_ROLE_NAMES.has(trimmed)) return true;
    if (NON_STAFFING_ROLE_NAMES.has(trimmed)) return false;
    // Unknown catalog titles (e.g. imported "Backend Engineer") — allow for staffing.
    return true;
}
