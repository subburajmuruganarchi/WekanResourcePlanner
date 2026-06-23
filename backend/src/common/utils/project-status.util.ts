import { ProjectStatus } from '../types/enums';

/** Canonical labels returned by the API. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    [ProjectStatus.PLANNING]: 'Planning',
    [ProjectStatus.ACTIVE]: 'Active',
    [ProjectStatus.COMPLETED]: 'Completed',
    [ProjectStatus.ON_HOLD]: 'OnHold',
};

/**
 * Normalize any Project sheet / Mongo status string to a canonical ProjectStatus.
 * Handles Active, active, ACTIVE, In Progress, On Hold, etc.
 */
export function normalizeProjectStatus(raw: string | undefined | null): ProjectStatus {
    const s = String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ');

    if (!s) return ProjectStatus.PLANNING;

    if (
        s === 'active' ||
        s === 'in progress' ||
        s === 'in-progress' ||
        s === 'ongoing' ||
        s === 'live' ||
        s === 'started'
    ) {
        return ProjectStatus.ACTIVE;
    }

    if (s === 'completed' || s === 'done' || s === 'closed') {
        return ProjectStatus.COMPLETED;
    }

    if (
        s === 'on hold' ||
        s === 'onhold' ||
        s === 'hold' ||
        s === 'proposal lost' ||
        s === 'lost'
    ) {
        return ProjectStatus.ON_HOLD;
    }

    if (s === 'planning' || s === 'planned' || s === 'proposal') {
        return ProjectStatus.PLANNING;
    }

    // Already canonical (case-insensitive)
    if (s === 'planning') return ProjectStatus.PLANNING;
    if (s === 'active') return ProjectStatus.ACTIVE;
    if (s === 'completed') return ProjectStatus.COMPLETED;
    if (s === 'onhold' || s === 'on hold') return ProjectStatus.ON_HOLD;

    return ProjectStatus.PLANNING;
}

export function isActiveProjectStatus(status: ProjectStatus): boolean {
    return status === ProjectStatus.ACTIVE;
}

/** Active or Planning — operational / in-flight delivery work. */
export function isOperationalProjectStatus(status: ProjectStatus): boolean {
    return status === ProjectStatus.ACTIVE || status === ProjectStatus.PLANNING;
}

/** Mongo filter: projects that count as operational for dashboards and staffing. */
export function operationalProjectMongoFilter(): Record<string, unknown> {
    return {
        is_active: { $ne: false },
        $or: [
            { status: { $in: [ProjectStatus.ACTIVE, ProjectStatus.PLANNING] } },
            { status: { $regex: /^active$/i } },
            { status: { $regex: /^planning$/i } },
            { status: { $regex: /^in[\s-]?progress$/i } },
            { status: { $regex: /^(ongoing|live|started|planned|proposal)$/i } },
        ],
    };
}

/** Mongo filter: strictly active (not planning-only). */
export function activeProjectMongoFilter(): Record<string, unknown> {
    return {
        is_active: { $ne: false },
        $or: activeProjectStatusOrConditions(),
    };
}

/** Status-only active filter (time entry picker — do not exclude on is_active flag alone). */
export function activeProjectStatusMongoFilter(): Record<string, unknown> {
    return { $or: activeProjectStatusOrConditions() };
}

function activeProjectStatusOrConditions(): Record<string, unknown>[] {
    return [
        { status: ProjectStatus.ACTIVE },
        { status: { $regex: /^active$/i } },
        { status: { $regex: /^in[\s-]?progress$/i } },
        { status: { $regex: /^(ongoing|live|started)$/i } },
    ];
}

/** Mongo filter for list queries filtered by a canonical status value. */
export function projectStatusListMongoFilter(status: ProjectStatus): Record<string, unknown> {
    switch (status) {
        case ProjectStatus.ACTIVE:
            return activeProjectMongoFilter();
        case ProjectStatus.PLANNING:
            return {
                is_active: { $ne: false },
                $or: [
                    { status: ProjectStatus.PLANNING },
                    { status: { $regex: /^planning$/i } },
                    { status: { $regex: /^(planned|proposal)$/i } },
                ],
            };
        case ProjectStatus.COMPLETED:
            return {
                $or: [
                    { status: ProjectStatus.COMPLETED },
                    { status: { $regex: /^completed$/i } },
                    { status: { $regex: /^(done|closed)$/i } },
                ],
            };
        case ProjectStatus.ON_HOLD:
            return {
                $or: [
                    { status: ProjectStatus.ON_HOLD },
                    { status: { $regex: /^on[\s-]?hold$/i } },
                    { status: { $regex: /^(hold|proposal lost|lost)$/i } },
                ],
            };
        default:
            return {};
    }
}
