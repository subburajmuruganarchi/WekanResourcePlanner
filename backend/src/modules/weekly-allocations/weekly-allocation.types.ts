import { WeeklyAllocationSource, WeeklyAllocationStatus } from '../../common/types/enums';

export interface WeeklyAllocationEntryDto {
    id: string;
    allocationId?: string;
    employeeId: string;
    employeeName?: string;
    projectId: string;
    projectName?: string;
    projectCode?: string;
    weekStart: string;
    plannedHours: number;
    actualHours: number;
    forecastHours: number;
    /** planned − actual */
    varianceHours: number;
    /** actual − planned */
    deltaHours: number;
    variancePercent?: number;
    actualsSyncedAt?: string;
    source: WeeklyAllocationSource;
    status: WeeklyAllocationStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface WeeklyGridPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface EmployeeWeekCapacityDto {
    employeeId: string;
    employeeName?: string;
    weekStart: string;
    capacityHours: number;
    committedHours: number;
    availableHours: number;
    utilizationPercent: number;
    benchPercent: number;
    isOverAllocated: boolean;
    plannedHours: number;
    actualHours: number;
    forecastHours: number;
    varianceHours: number;
    planVarianceHours: number;
    deltaHours: number;
    actualUtilizationPercent: number;
    plannedUtilizationPercent: number;
    variancePercent: number;
    forecastAccuracyPercent: number;
}

export interface WeeklyGridResponse {
    weeks: string[];
    rows: WeeklyAllocationEntryDto[];
    pagination: WeeklyGridPagination;
    capacityByEmployeeWeek?: EmployeeWeekCapacityDto[];
}

export interface WeeklyGridBulkUpdateItem {
    employeeId: string;
    projectId: string;
    weekStart: string;
    plannedHours?: number;
    actualHours?: number;
    forecastHours?: number;
    forecastHoursSet?: boolean;
    allocationId?: string;
    source?: WeeklyAllocationSource;
    status?: WeeklyAllocationStatus;
}

export interface WeeklyGridBulkUpdateResult {
    upserted: number;
    modified: number;
    rejected: { index: number; reason: string }[];
    capacityWarnings: EmployeeWeekCapacityDto[];
}

export interface WeeklyGridQuery {
    weekStartFrom: Date;
    weekStartTo: Date;
    employeeIds?: string[];
    projectIds?: string[];
    page: number;
    limit: number;
    includeCapacitySummary: boolean;
}
