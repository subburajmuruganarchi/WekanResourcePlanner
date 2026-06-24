import { ProjectStatus } from '../types/enums';

/** Canonical labels returned by the API. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    [ProjectStatus.PROPOSAL]: 'Proposal',
    [ProjectStatus.PLANNING]: 'Proposal',
    [ProjectStatus.ACTIVE]: 'Active',
    [ProjectStatus.COMPLETED]: 'Completed',
    [ProjectStatus.PROPOSAL_LOST]: 'Proposal lost',
    [ProjectStatus.ON_HOLD]: 'On Hold',
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

    if (!s) return ProjectStatus.PROPOSAL;

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

    if (s === 'proposal lost' || s === 'lost' || s === 'proposallost') {
        return ProjectStatus.PROPOSAL_LOST;
    }

    if (s === 'on hold' || s === 'onhold' || s === 'hold') {
        return ProjectStatus.ON_HOLD;
    }

    if (s === 'planning' || s === 'planned' || s === 'proposal') {
        return ProjectStatus.PROPOSAL;
    }

    // Already canonical (case-insensitive)
    if (s === 'proposal') return ProjectStatus.PROPOSAL;
    if (s === 'planning') return ProjectStatus.PROPOSAL;
    if (s === 'active') return ProjectStatus.ACTIVE;
    if (s === 'completed') return ProjectStatus.COMPLETED;
    if (s === 'proposallost' || s === 'proposal lost') return ProjectStatus.PROPOSAL_LOST;
    if (s === 'onhold' || s === 'on hold') return ProjectStatus.ON_HOLD;

    return ProjectStatus.PROPOSAL;
}

export function isActiveProjectStatus(status: ProjectStatus): boolean {
    return status === ProjectStatus.ACTIVE;
}

/** Active or Proposal — operational / in-flight delivery work. */
export function isOperationalProjectStatus(status: ProjectStatus): boolean {
    return (
        status === ProjectStatus.ACTIVE ||
        status === ProjectStatus.PROPOSAL ||
        status === ProjectStatus.PLANNING
    );
}

/** Mongo filter: projects that count as operational for dashboards and staffing. */
export function operationalProjectMongoFilter(): Record<string, unknown> {
    return {
        is_active: { $ne: false },
        $or: [
            { status: { $in: [ProjectStatus.ACTIVE, ProjectStatus.PROPOSAL, ProjectStatus.PLANNING] } },
            { status: { $regex: /^active$/i } },
            { status: { $regex: /^planning$/i } },
            { status: { $regex: /^proposal$/i } },
            { status: { $regex: /^in[\s-]?progress$/i } },
            { status: { $regex: /^(ongoing|live|started|planned)$/i } },
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
        case ProjectStatus.PROPOSAL:
        case ProjectStatus.PLANNING:
            return {
                is_active: { $ne: false },
                $or: [
                    { status: { $in: [ProjectStatus.PROPOSAL, ProjectStatus.PLANNING] } },
                    { status: { $regex: /^planning$/i } },
                    { status: { $regex: /^proposal$/i } },
                    { status: { $regex: /^planned$/i } },
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
        case ProjectStatus.PROPOSAL_LOST:
            return {
                $or: [
                    { status: ProjectStatus.PROPOSAL_LOST },
                    { status: { $regex: /^proposal[\s-]?lost$/i } },
                    { status: { $regex: /^lost$/i } },
                ],
            };
        case ProjectStatus.ON_HOLD:
            return {
                $or: [
                    { status: ProjectStatus.ON_HOLD },
                    { status: { $regex: /^on[\s-]?hold$/i } },
                    { status: { $regex: /^hold$/i } },
                ],
            };
        default:
            return {};
    }
}
