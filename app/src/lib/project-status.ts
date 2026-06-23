import type { Project, ProjectStatus } from '@/types/api';

const CANONICAL: ProjectStatus[] = ['Planning', 'Active', 'Completed', 'OnHold'];

/**
 * Normalize sheet/Mongo status strings to canonical API values.
 * Project sheet often uses "active", "Active", "In Progress", "On Hold", etc.
 */
export function normalizeProjectStatus(raw: string | undefined | null): ProjectStatus {
    const s = String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ');

    if (!s) return 'Planning';

    if (
        s === 'active' ||
        s === 'in progress' ||
        s === 'in-progress' ||
        s === 'ongoing' ||
        s === 'live' ||
        s === 'started'
    ) {
        return 'Active';
    }

    if (s === 'completed' || s === 'done' || s === 'closed') {
        return 'Completed';
    }

    if (
        s === 'on hold' ||
        s === 'onhold' ||
        s === 'hold' ||
        s === 'proposal lost' ||
        s === 'lost'
    ) {
        return 'OnHold';
    }

    if (s === 'planning' || s === 'planned' || s === 'proposal') {
        return 'Planning';
    }

    const exact = CANONICAL.find((c) => c.toLowerCase() === s.replace(/\s/g, ''));
    if (exact) return exact;

    return 'Planning';
}

export function projectStatusOf(project: Pick<Project, 'status'>): ProjectStatus {
    return normalizeProjectStatus(project.status);
}

export function isActiveProject(project: Pick<Project, 'status'>): boolean {
    return projectStatusOf(project) === 'Active';
}

/** Active or Planning — used for portfolio / delivery operational views. */
export function isOperationalProject(project: Pick<Project, 'status'>): boolean {
    const status = projectStatusOf(project);
    return status === 'Active' || status === 'Planning';
}

export function projectStatusMatches(
    project: Pick<Project, 'status'>,
    filter: ProjectStatus | 'all'
): boolean {
    if (filter === 'all') return true;
    return projectStatusOf(project) === filter;
}
