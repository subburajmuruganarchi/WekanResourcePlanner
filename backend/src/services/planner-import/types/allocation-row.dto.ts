export interface AllocationWeekHour {
    weekStart: Date;
    hours: number;
}

export interface AllocationImportRow {
    pid: string;
    projectName: string;
    projectType: string;
    projectStatus: string;
    employeeCode: string;
    resourceName: string;
    jobRole: string;
    resourceType: string;
    activeFlag: string;
    weeklyHours: AllocationWeekHour[];
}
