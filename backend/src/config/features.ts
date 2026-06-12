import { env } from './env';

/**
 * Central feature flags for incremental ERP rollout.
 * Prefer toggling via environment variables in deployment platforms.
 */
export const features = {
    /** Master switch for /api/weekly-allocations routes. */
    weeklyAllocationsEnabled: env.FEATURE_WEEKLY_ALLOCATIONS_ENABLED,

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
    weeklyActualsSyncEnabled: env.FEATURE_WEEKLY_ACTUALS_SYNC_ENABLED,

    /** Persist weekly planned/actual/variance snapshots after sync. */
    weeklyUtilizationSnapshots: env.FEATURE_WEEKLY_UTILIZATION_SNAPSHOTS,
} as const;

export type FeatureFlags = typeof features;
