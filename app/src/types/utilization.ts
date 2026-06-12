export interface UtilizationVarianceRow {
    employeeId: string;
    employeeName?: string;
    projectId: string;
    projectName?: string;
    projectCode?: string;
    weekStart: string;
    plannedHours: number;
    actualHours: number;
    forecastHours: number;
    varianceHours: number;
    deltaHours: number;
    variancePercent: number;
    actualUtilizationPercent: number;
    forecastAccuracyPercent: number;
}

export interface UtilizationVarianceResponse {
    weekStartFrom: string;
    weekStartTo: string;
    rows: UtilizationVarianceRow[];
    summary: {
        totalPlannedHours: number;
        totalActualHours: number;
        totalVarianceHours: number;
        avgVariancePercent: number;
        underutilizedEmployeeCount: number;
        overrunProjectCount: number;
    };
    underutilizedEmployees: {
        employeeId: string;
        employeeName?: string;
        plannedHours: number;
        actualHours: number;
        varianceHours: number;
    }[];
    overrunProjects: {
        projectId: string;
        projectName?: string;
        projectCode?: string;
        plannedHours: number;
        actualHours: number;
        overrunHours: number;
    }[];
}

export interface UtilizationDashboardSummary {
    weekStart: string;
    totalPlannedHours: number;
    totalActualHours: number;
    planVarianceHours: number;
    avgActualUtilizationPercent: number;
    avgVariancePercent: number;
    overrunProjects: { projectId: string; projectName: string; overrunHours: number }[];
}
