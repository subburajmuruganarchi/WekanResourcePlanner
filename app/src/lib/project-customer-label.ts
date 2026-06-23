import type { Project } from '@/types/api';

/**
 * In R360, each project's display name is also the customer/account name
 * (Google Sheet "Project" column — no separate client field).
 */
export function projectCustomerLabel(project: Pick<Project, 'name' | 'clientName'>): string {
    const name = project.name?.trim();
    if (name) return name;
    return project.clientName?.trim() || '—';
}
