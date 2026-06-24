import type { Project, ProjectStatus } from '@/types/api';

const CANONICAL: ProjectStatus[] = [
    'Proposal',
    'Planning',
    'Active',
    'Completed',
    'ProposalLost',
    'OnHold',
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
    Proposal: 'Proposal',
    Planning: 'Proposal',
    Active: 'Active',
    Completed: 'Completed',
    ProposalLost: 'Proposal lost',
    OnHold: 'On Hold',
};

/**
 * Normalize sheet/Mongo status strings to canonical API values.
 */
export function normalizeProjectStatus(raw: string | undefined | null): ProjectStatus {
    const s = String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ');

    if (!s) return 'Proposal';

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

    if (s === 'proposal lost' || s === 'lost' || s === 'proposallost') {
        return 'ProposalLost';
    }

    if (s === 'on hold' || s === 'onhold' || s === 'hold') {
        return 'OnHold';
    }

    if (s === 'planning' || s === 'planned' || s === 'proposal') {
        return 'Proposal';
    }

    const exact = CANONICAL.find((c) => c.toLowerCase() === s.replace(/\s/g, ''));
    if (exact) return exact === 'Planning' ? 'Proposal' : exact;

    return 'Proposal';
}

export function projectStatusOf(project: Pick<Project, 'status'>): ProjectStatus {
    return normalizeProjectStatus(project.status);
}

export function projectStatusLabel(status: ProjectStatus | string | undefined | null): string {
    const canonical = normalizeProjectStatus(status);
    return STATUS_LABELS[canonical] ?? canonical;
}

export function isActiveProject(project: Pick<Project, 'status'>): boolean {
    return projectStatusOf(project) === 'Active';
}

/** Active or Proposal — used for portfolio / delivery operational views. */
export function isOperationalProject(project: Pick<Project, 'status'>): boolean {
    const status = projectStatusOf(project);
    return status === 'Active' || status === 'Proposal';
}

export function projectStatusMatches(
    project: Pick<Project, 'status'>,
    filter: ProjectStatus | 'all'
): boolean {
    if (filter === 'all') return true;
    if (filter === 'Proposal') {
        const status = projectStatusOf(project);
        return status === 'Proposal';
    }
    return projectStatusOf(project) === filter;
}

/** Admin-editable project status options (sheet-aligned). */
export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Completed', label: 'Completed' },
    { value: 'ProposalLost', label: 'Proposal lost' },
    { value: 'Proposal', label: 'Proposal' },
    { value: 'OnHold', label: 'On Hold' },
];
