import { env } from './env';

const mvpMode = env.FEATURE_MVP_MODE;
const timeEntryEnabled = env.FEATURE_TIME_ENTRY_ENABLED ?? !mvpMode;
const timesheetApprovalEnabled = env.FEATURE_TIMESHEET_APPROVAL_ENABLED ?? !mvpMode;

/**
 * Central feature flags for incremental ERP rollout.
 * Prefer toggling via environment variables in deployment platforms.
 */
export const features = {
    /** MVP scope — project/people CRUD, PM actuals, no time entry by default. */
    mvpMode,

    /** Employee time entry UI and APIs. Off when MVP mode is on unless explicitly enabled. */
    timeEntryEnabled,

    /** PM approval queue for timesheets. Off when MVP mode is on unless explicitly enabled. */
    timesheetApprovalEnabled,

    /** Master switch for /api/weekly-allocations routes. On when MVP mode is enabled. */
    weeklyAllocationsEnabled: env.FEATURE_WEEKLY_ALLOCATIONS_ENABLED || mvpMode,

    /**
     * GET grid synthesizes planned hours from active project_allocations
     * when no weekly_allocation_entries exist (backward compatibility).
     */
    weeklyAllocationsLegacyRead: env.FEATURE_WEEKLY_ALLOCATIONS_LEGACY_READ,

    /** PUT grid rejects employee-week totals above WEEKLY_CAPACITY_HOURS. */
    weeklyAllocationsValidateCapacity: env.FEATURE_WEEKLY_ALLOCATIONS_VALIDATE_CAPACITY,

    /** Default full-time capacity per employee per ISO week (hours). */
    weeklyCapacityHours: env.WEEKLY_CAPACITY_HOURS,

    utilizationApiEnabled: env.FEATURE_UTILIZATION_API_ENABLED,

    /** Reconcile approved time_entries → weekly_allocation_entries.actual_hours */
    weeklyActualsSyncEnabled:
        env.FEATURE_WEEKLY_ACTUALS_SYNC_ENABLED && timeEntryEnabled,

    /** Persist weekly planned/actual/variance snapshots after sync. */
    weeklyUtilizationSnapshots: env.FEATURE_WEEKLY_UTILIZATION_SNAPSHOTS,
} as const;

export type FeatureFlags = typeof features;
