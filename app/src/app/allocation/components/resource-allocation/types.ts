export type AllocationViewMode = 'timeline' | 'grid' | 'heatmap' | 'capacity';

export type UtilizationStatus = 'available' | 'optimal' | 'high' | 'overloaded' | 'on-leave';

export type AvailabilityFilter = 'all' | 'available' | 'partial' | 'overloaded';

export interface AllocationWorkspaceFilters {
    projectId: string;
    role: string;
    skill: string;
    department: string;
    availability: AvailabilityFilter;
    utilizationMin: number;
    utilizationMax: number;
}

export const DEFAULT_WORKSPACE_FILTERS: AllocationWorkspaceFilters = {
    projectId: '',
    role: '',
    skill: '',
    department: '',
    availability: 'all',
    utilizationMin: 0,
    utilizationMax: 150,
};

export interface AllocationMetrics {
    projectCount: number;
    resourceCount: number;
    allocatedHours: number;
    utilizationPercent: number;
    overCapacityCount: number;
}

export interface AIInsight {
    id: string;
    type: 'risk' | 'skill-gap' | 'optimization';
    title: string;
    description: string;
    actionLabel?: string;
}
