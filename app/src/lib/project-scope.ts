import type { Project } from '@/types/api';

/** True when the employee is project manager or owner on the project. */
export function isProjectManagedByEmployee(
    project: Project,
    employeeId: string | undefined
): boolean {
    if (!employeeId) return false;
    if (project.managerId === employeeId) return true;
    if (project.ownerId === employeeId) return true;
    return project.managerIds?.includes(employeeId) ?? false;
}

export function filterProjectsManagedByEmployee(
    projects: Project[],
    employeeId: string | undefined
): Project[] {
    if (!employeeId) return [];
    return projects.filter((p) => isProjectManagedByEmployee(p, employeeId));
}
