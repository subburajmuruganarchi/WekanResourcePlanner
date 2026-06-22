export type TimeViewMode = 'calendar' | 'grid' | 'summary';

export type TimesheetStatus =
    | 'empty'
    | 'draft'
    | 'partial'
    | 'submitted'
    | 'approved'
    | 'rejected';

export type ProjectFilter = 'all' | 'allocated' | 'favorite' | 'billable';

export interface TimeKPIs {
    weeklyCapacity: number;
    loggedHours: number;
    remainingHours: number;
    utilizationPercent: number;
    projectsWorked: number;
    approvalLabel: string;
}

export interface TimeSuggestion {
    id: string;
    message: string;
    actionLabel?: string;
    dayIndex?: number;
    projectCode?: string;
    hours?: number;
}

export interface GridRow {
    id: string;
    employee: string;
    project: string;
    projectCode: string;
    task: string;
    date: string;
    dayLabel: string;
    hours: number;
    status: string;
}
