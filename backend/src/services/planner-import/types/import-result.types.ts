export interface SkippedRow {
    identifier: string;
    reason: string;
}

export interface SheetImportResult {
    rowsReceived: number;
    rowsProcessed: number;
    rowsSkipped: number;
    skippedRows: SkippedRow[];
    errors: string[];
}

export interface PlannerImportOptions {
    resourceBuffer?: Buffer;
    projectBuffer?: Buffer;
    allocationBuffer?: Buffer;
    resourceOnly?: boolean;
    persistToDisk?: boolean;
    sheetsDir?: string;
    fallbackWorkbookPath?: string;
    /** When set, enables soft-delete tracking via last_sync_id on employees/projects. */
    syncId?: string;
}

export interface PlannerImportResult {
    employeesUpserted: number;
    projectsUpserted: number;
    allocationsUpserted: number;
    weeklyEntriesUpserted: number;
    jobRoles: number;
    skills: number;
    resourceOnly: boolean;
    message: string;
    rowsReceived?: number;
    rowsProcessed?: number;
    rowsSkipped?: number;
    skippedRows?: SkippedRow[];
    errors?: string[];
}

export interface GoogleSheetWebhookBody {
    sheet: 'Resource' | 'Project' | 'Project_Allocation';
    rows: Record<string, unknown>[];
    weekHeaders?: Record<string, string>[];
}

export interface GoogleSheetSyncResponse {
    success: boolean;
    sheet: string;
    rowsReceived: number;
    rowsProcessed: number;
    rowsSkipped: number;
    errors: string[];
    skippedRows?: SkippedRow[];
    syncRunId?: string;
}
