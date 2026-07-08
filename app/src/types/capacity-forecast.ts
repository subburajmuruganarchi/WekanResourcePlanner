export type AllocationConflictType =
    | 'over_allocation'
    | 'zero_planned_hours'
    | 'under_planned_hours'
    | 'allocation_percent_exceeded';

export interface AllocationConflict {
    type: AllocationConflictType;
    employeeId: string;
    employeeName?: string;
    projectId?: string;
    projectName?: string;
    message: string;
    severity: 'HIGH' | 'MEDIUM';
    plannedHours?: number;
    expectedHours?: number;
    peakCommittedPercent?: number;
}

export interface ProjectCapacityForecast {
    projectId: string;
    projectName: string;
    projectCode: string;
    allocatedMembers: number;
    expectedHours: number;
    plannedHours: number;
    gapHours: number;
    planCoveragePercent: number;
    conflicts: AllocationConflict[];
}

export interface EmployeeCapacityForecast {
    employeeId: string;
    employeeName: string;
    capacityHours: number;
    portfolioCommittedHours: number;
    totalCommittedHours: number;
    availableHours: number;
    utilizationPercent: number;
    availabilityPercent: number;
    isOverAllocated: boolean;
    peakCommittedPercent: number;
}

export interface PortfolioCapacityForecast {
    weekStart: string;
    capacityHoursPerWeek: number;
    employeeCount: number;
    projectCount: number;
    totalCapacityHours: number;
    committedHours: number;
    availableHours: number;
    capacityGapHours: number;
    utilizationPercent: number;
    employees: EmployeeCapacityForecast[];
    projects: ProjectCapacityForecast[];
    conflicts: AllocationConflict[];
    recommendation: string;
}
