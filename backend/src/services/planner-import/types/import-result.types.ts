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
    rows: Record<string, unknown>[] | unknown[][] | { header: string; value: unknown }[][];
    /** When rows are value arrays, header labels in sheet column order (first duplicate wins). */
    headers?: string[];
    weekHeaders?: Record<string, string>[];
    /** Shared across all sheets in a full sync (header or body). */
    syncBatchId?: string;
    batchId?: string;
    /** Shared across row chunks of one sheet upload (Apps Script batches >50 rows). */
    sheetSyncSessionId?: string;
    /** Zero-based chunk index when a sheet is split into multiple webhook posts. */
    batchIndex?: number;
    /** Total webhook posts for this sheet upload. */
    totalBatches?: number;
    /** When true, allows re-processing a FAILED batched sheet import. */
    retry?: boolean;
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
    syncId?: string;
    requestId?: string;
    durationMs?: number;
    /** True when returning a prior SUCCESS SyncRun without re-importing. */
    cached?: boolean;
    /** Total rows in webhook payload before placeholder/dummy filtering (Resource only). */
    rawRowsReceived?: number;
    /** Rows excluded as placeholder/dummy/empty before import (Resource only). */
    rowsFilteredFromSheet?: number;
}

export interface SheetSyncSummary {
    received: number;
    processed: number;
    skipped: number;
    upserted: number;
    errors: string[];
    status: 'SUCCESS' | 'FAILED' | 'MISSING' | 'RUNNING' | 'PENDING';
    lastSyncAt: string | null;
}

export interface FullSyncSummary {
    resource: SheetSyncSummary;
    project: SheetSyncSummary;
    allocation: SheetSyncSummary;
}

export interface FullSyncResponse {
    status: 'success' | 'running' | 'failed' | 'STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    message: string;
    syncId: string;
    requestId: string;
    summary?: FullSyncSummary;
    durationMs?: number;
    errors: string[];
    syncCompleted: boolean;
    timestamp: string;
    version: string;
    data?: unknown;
    currentSheet?: string;
    progress?: number;
}

export interface SheetSyncProgress {
    processed: number;
    skipped: number;
    state: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
}

export interface FullSyncJobStatusResponse {
    status: 'STARTED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    syncId: string;
    syncBatchId: string;
    requestId?: string;
    currentSheet?: string;
    progress: number;
    sheets?: {
        Resource: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
        Project: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
        Project_Allocation: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    };
    sheetCounts?: {
        Resource: SheetSyncProgress;
        Project: SheetSyncProgress;
        Project_Allocation: SheetSyncProgress;
    };
    summary?: FullSyncSummary;
    errors: string[];
    syncCompleted: boolean;
    durationMs?: number;
    timestamp: string;
}
