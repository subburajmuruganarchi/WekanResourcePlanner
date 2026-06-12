import { useCallback, useMemo, useRef, useState } from 'react';
import { api } from './api-client';
import {
    pivotGridRows,
    clonePlannerRows,
    filterPlannerRowsByUtilization,
    cellKey,
} from './weekly-grid-pivot';
import type {
    WeeklyAllocationGridResponse,
    WeeklyGridBulkSaveResult,
    WeeklyGridFetchParams,
    WeeklyGridUpdateItem,
    WeeklyPlannerGridRow,
    WeeklyCapacitySummary,
    UtilizationFilterState,
} from '@/types/weekly-allocation';

export interface WeeklyGridFilters {
    weekStartFrom: string;
    weekStartTo: string;
    employeeId?: string;
    projectId?: string;
    utilization: UtilizationFilterState;
}

interface UseWeeklyAllocationGridOptions {
    /** Planner rows (employee × project) per API page (max 500). */
    pageSize?: number;
    canEdit: boolean;
}

function buildQueryString(params: WeeklyGridFetchParams): string {
    const q = new URLSearchParams();
    q.set('weekStartFrom', params.weekStartFrom);
    q.set('weekStartTo', params.weekStartTo);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 500));
    q.set('includeCapacitySummary', params.includeCapacitySummary ? 'true' : 'false');
    if (params.employeeId) q.set('employeeId', params.employeeId);
    if (params.projectId) q.set('projectId', params.projectId);
    return q.toString();
}

export function useWeeklyAllocationGrid(options: UseWeeklyAllocationGridOptions) {
    const pageSize = options.pageSize ?? 500;

    const [filters, setFilters] = useState<WeeklyGridFilters | null>(null);
    const [weeks, setWeeks] = useState<string[]>([]);
    const [plannerRows, setPlannerRows] = useState<WeeklyPlannerGridRow[]>([]);
    const [capacitySummary, setCapacitySummary] = useState<WeeklyCapacitySummary[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: pageSize,
        total: 0,
        totalPages: 1,
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const [cacheVersion, setCacheVersion] = useState(0);
    const dirtyRef = useRef<Map<string, WeeklyGridUpdateItem>>(new Map());
    const [dirtyCount, setDirtyCount] = useState(0);
    const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
    const rollbackSnapshotRef = useRef<WeeklyPlannerGridRow[] | null>(null);

    const syncDirtyCount = () => {
        setDirtyCount(dirtyRef.current.size);
        setDirtyKeys(new Set(dirtyRef.current.keys()));
    };

    const invalidateCache = useCallback(() => {
        setCacheVersion((v) => v + 1);
    }, []);

    const fetchGrid = useCallback(
        async (nextFilters: WeeklyGridFilters, page = 1) => {
            setLoading(true);
            setError(null);
            setSaveMessage(null);
            try {
                const qs = buildQueryString({
                    weekStartFrom: nextFilters.weekStartFrom,
                    weekStartTo: nextFilters.weekStartTo,
                    employeeId: nextFilters.employeeId,
                    projectId: nextFilters.projectId,
                    page,
                    limit: pageSize,
                    includeCapacitySummary: true,
                });

                const data = await api.get<WeeklyAllocationGridResponse>(
                    `/weekly-allocations/grid?${qs}`
                );

                setFilters(nextFilters);
                setWeeks(data.weeks);
                setPlannerRows(pivotGridRows(data.rows));
                setCapacitySummary(data.capacityByEmployeeWeek ?? []);
                setPagination(data.pagination);
                dirtyRef.current.clear();
                syncDirtyCount();
                rollbackSnapshotRef.current = null;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load weekly grid');
            } finally {
                setLoading(false);
            }
        },
        [pageSize]
    );

    const displayRows = useMemo(() => {
        if (!filters) return plannerRows;
        return filterPlannerRowsByUtilization(
            plannerRows,
            weeks,
            filters.utilization
        );
    }, [plannerRows, weeks, filters]);

    const updatePlannedHours = useCallback(
        (row: WeeklyPlannerGridRow, weekStart: string, plannedHours: number) => {
            if (!options.canEdit) return;

            const clamped = Math.max(0, Math.min(168, Math.round(plannedHours * 100) / 100));
            const key = cellKey(row.employeeId, row.projectId, weekStart);

            setPlannerRows((prev) =>
                prev.map((r) => {
                    if (r.rowKey !== row.rowKey) return r;
                    const existing = r.weekCells[weekStart];
                    return {
                        ...r,
                        weekCells: {
                            ...r.weekCells,
                            [weekStart]: {
                                id: existing?.id,
                                allocationId: existing?.allocationId,
                                employeeId: r.employeeId,
                                projectId: r.projectId,
                                weekStart,
                                plannedHours: clamped,
                                actualHours: existing?.actualHours ?? 0,
                                forecastHours: existing?.forecastHours ?? clamped,
                                source: existing?.isLegacy ? 'Planned' : existing?.source ?? 'Planned',
                                status: existing?.status ?? 'Draft',
                                isLegacy: existing?.isLegacy,
                            },
                        },
                    };
                })
            );

            dirtyRef.current.set(key, {
                employeeId: row.employeeId,
                projectId: row.projectId,
                weekStart,
                plannedHours: clamped,
                forecastHours: clamped,
                allocationId: row.weekCells[weekStart]?.allocationId,
                source: 'Planned',
                status: 'Draft',
            });
            syncDirtyCount();
        },
        [options.canEdit]
    );

    const discardChanges = useCallback(() => {
        if (rollbackSnapshotRef.current) {
            setPlannerRows(clonePlannerRows(rollbackSnapshotRef.current));
        } else if (filters) {
            void fetchGrid(filters, pagination.page);
            return;
        }
        dirtyRef.current.clear();
        syncDirtyCount();
        rollbackSnapshotRef.current = null;
    }, [filters, fetchGrid, pagination.page]);

    const saveBulk = useCallback(async (): Promise<boolean> => {
        if (!options.canEdit || dirtyRef.current.size === 0) return true;

        const updates = [...dirtyRef.current.values()];
        rollbackSnapshotRef.current = clonePlannerRows(plannerRows);
        setSaving(true);
        setError(null);
        setSaveMessage(null);

        try {
            const result = await api.put<WeeklyGridBulkSaveResult>('/weekly-allocations/grid', {
                updates,
                validateCapacity: true,
                allowOverAllocation: false,
            });

            if (result.rejected.length > 0) {
                const msg = result.rejected.map((r) => `#${r.index}: ${r.reason}`).join('; ');
                throw new Error(msg);
            }

            dirtyRef.current.clear();
            syncDirtyCount();
            setSaveMessage(
                `Saved ${result.upserted + result.modified} cell(s)${
                    result.capacityWarnings.length
                        ? ` — ${result.capacityWarnings.length} capacity warning(s)`
                        : ''
                }`
            );
            invalidateCache();
            if (filters) {
                await fetchGrid(filters, pagination.page);
            }
            return true;
        } catch (err) {
            if (rollbackSnapshotRef.current) {
                setPlannerRows(clonePlannerRows(rollbackSnapshotRef.current));
            }
            setError(err instanceof Error ? err.message : 'Failed to save weekly grid');
            return false;
        } finally {
            setSaving(false);
            rollbackSnapshotRef.current = null;
        }
    }, [
        options.canEdit,
        plannerRows,
        filters,
        fetchGrid,
        pagination.page,
        invalidateCache,
    ]);

    const refetch = useCallback(() => {
        if (filters) return fetchGrid(filters, pagination.page);
        return Promise.resolve();
    }, [filters, fetchGrid, pagination.page]);

    const setPage = useCallback(
        (page: number) => {
            if (filters) void fetchGrid(filters, page);
        },
        [filters, fetchGrid]
    );

    return {
        filters,
        setFilters,
        weeks,
        plannerRows,
        displayRows,
        capacitySummary,
        pagination,
        loading,
        saving,
        error,
        saveMessage,
        dirtyCount,
        cacheVersion,
        fetchGrid,
        updatePlannedHours,
        saveBulk,
        discardChanges,
        refetch,
        setPage,
        invalidateCache,
        hasDirty: dirtyCount > 0,
        dirtyKeys,
    };
}
