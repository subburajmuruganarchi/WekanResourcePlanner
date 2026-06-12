/** Weekly planning API types (aligned with backend weekly-allocation module). */

export type WeeklyAllocationSource =
    | 'Planned'
    | 'Actual'
    | 'Forecast'
    | 'LegacySync'
    | 'Manual';

export type WeeklyAllocationStatus = 'Draft' | 'Published' | 'Locked' | 'Archived';

export interface WeeklyAllocationCell {
    id?: string;
    allocationId?: string;
    employeeId: string;
    projectId: string;
    weekStart: string;
    plannedHours: number;
    actualHours: number;
    forecastHours: number;
    /** planned − actual */
    varianceHours?: number;
    /** actual − planned */
    deltaHours?: number;
    variancePercent?: number;
    source?: WeeklyAllocationSource;
    status?: WeeklyAllocationStatus;
    isLegacy?: boolean;
}

/** Flat API row (one employee × project × week). */
export interface WeeklyAllocationGridRow {
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
    varianceHours?: number;
    deltaHours?: number;
    variancePercent?: number;
    actualsSyncedAt?: string;
    source: WeeklyAllocationSource;
    status: WeeklyAllocationStatus;
}

export interface WeeklyGridPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface WeeklyCapacitySummary {
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
    planVarianceHours?: number;
    deltaHours?: number;
    actualUtilizationPercent?: number;
    plannedUtilizationPercent?: number;
    variancePercent?: number;
    forecastAccuracyPercent?: number;
}

export interface WeeklyAllocationGridResponse {
    weeks: string[];
    rows: WeeklyAllocationGridRow[];
    pagination: WeeklyGridPagination;
    capacityByEmployeeWeek?: WeeklyCapacitySummary[];
}

export interface WeeklyGridUpdateItem {
    employeeId: string;
    projectId: string;
    weekStart: string;
    plannedHours?: number;
    actualHours?: number;
    forecastHours?: number;
    allocationId?: string;
    source?: WeeklyAllocationSource;
    status?: WeeklyAllocationStatus;
}

export interface WeeklyGridUpdateRequest {
    updates: WeeklyGridUpdateItem[];
    validateCapacity?: boolean;
    allowOverAllocation?: boolean;
}

export interface WeeklyGridBulkSaveResult {
    upserted: number;
    modified: number;
    rejected: { index: number; reason: string }[];
    capacityWarnings: WeeklyCapacitySummary[];
}

/** Pivoted row for AG Grid (one row per employee × project). */
export interface WeeklyPlannerGridRow {
    rowKey: string;
    employeeId: string;
    employeeName: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    weekCells: Record<string, WeeklyAllocationCell>;
}

export type UtilizationFilterState = 'all' | 'over_allocated' | 'bench' | 'high_utilization';

export interface WeeklyGridFetchParams {
    weekStartFrom: string;
    weekStartTo: string;
    employeeId?: string;
    projectId?: string;
    page?: number;
    limit?: number;
    includeCapacitySummary?: boolean;
}
