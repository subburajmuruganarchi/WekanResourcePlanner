import { useCallback, useMemo, useRef, useState } from 'react';
import { api } from './api-client';
import {
    pivotGridRows,
    clonePlannerRows,
    filterPlannerRowsByUtilization,
    cellKey,
    rowKey,
} from './weekly-grid-pivot';
import type {
    WeeklyAllocationGridResponse,
    WeeklyGridBulkSaveResult,
    WeeklyGridFetchParams,
    WeeklyGridFilters,
    WeeklyGridUpdateItem,
    WeeklyPlannerGridRow,
    WeeklyCapacitySummary,
} from '@/types/weekly-allocation';
import { notifyWeeklyGridUpdated } from './weekly-grid-sync';

export type { WeeklyGridFilters };

interface UseWeeklyAllocationGridOptions {
    /** Planner rows (employee × project) per API page (max 500). */
    pageSize?: number;
    canEdit: boolean;
    /** When true, loads every page and merges rows (for allocation matrix). */
    fetchAllPages?: boolean;
    /** When true, saves succeed even if an employee exceeds weekly capacity across projects. */
    allowOverAllocation?: boolean;
    /** When true, include active projects with role gaps but no assigned resource yet. */
    includeUnstaffedProjects?: boolean;
}

function buildQueryString(params: WeeklyGridFetchParams): string {
    const q = new URLSearchParams();
    q.set('weekStartFrom', params.weekStartFrom);
    q.set('weekStartTo', params.weekStartTo);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 500));
    q.set('includeCapacitySummary', params.includeCapacitySummary ? 'true' : 'false');
    if (params.excludeBench) q.set('excludeBench', 'true');
    if (params.includeUnstaffedProjects) q.set('includeUnstaffedProjects', 'true');
    if (params.employeeId) q.set('employeeId', params.employeeId);
    if (params.projectId) q.set('projectId', params.projectId);
    return q.toString();
}

const BENCH_PROJECT_CODE = 'BENCH';

function withoutBenchRows(rows: WeeklyPlannerGridRow[]): WeeklyPlannerGridRow[] {
    return rows.filter(
        (r) => r.projectCode !== BENCH_PROJECT_CODE && r.projectName !== 'Available / Bench'
    );
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
                const baseParams: WeeklyGridFetchParams = {
                    weekStartFrom: nextFilters.weekStartFrom,
                    weekStartTo: nextFilters.weekStartTo,
                    employeeId: nextFilters.employeeId,
                    projectId: nextFilters.projectId,
                    limit: pageSize,
                    includeCapacitySummary: true,
                    excludeBench: nextFilters.excludeBench,
                    includeUnstaffedProjects: options.includeUnstaffedProjects,
                };

                const fetchPage = (p: number) =>
                    api.get<WeeklyAllocationGridResponse>(
                        `/weekly-allocations/grid?${buildQueryString({ ...baseParams, page: p })}`
                    );

                const first = await fetchPage(page);
                let allFlatRows = [...first.rows];

                if (options.fetchAllPages && first.pagination.totalPages > 1) {
                    for (let p = 2; p <= first.pagination.totalPages; p++) {
                        const next = await fetchPage(p);
                        allFlatRows = allFlatRows.concat(next.rows);
                    }
                }

                setFilters(nextFilters);
                setWeeks(first.weeks);
                setPlannerRows(withoutBenchRows(pivotGridRows(allFlatRows)));
                setCapacitySummary(first.capacityByEmployeeWeek ?? []);
                setPagination(
                    options.fetchAllPages
                        ? {
                              ...first.pagination,
                              page: 1,
                              total: withoutBenchRows(pivotGridRows(allFlatRows)).length,
                              totalPages: 1,
                          }
                        : first.pagination
                );
                dirtyRef.current.clear();
                syncDirtyCount();
                rollbackSnapshotRef.current = null;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load weekly grid');
            } finally {
                setLoading(false);
            }
        },
        [pageSize, options.fetchAllPages, options.includeUnstaffedProjects]
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
            const allowOverAllocation = options.allowOverAllocation ?? false;
            const result = await api.put<WeeklyGridBulkSaveResult>('/weekly-allocations/grid', {
                updates,
                validateCapacity: true,
                allowOverAllocation,
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
            notifyWeeklyGridUpdated();
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
        options.allowOverAllocation,
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

    const appendPlannerRow = useCallback((row: WeeklyPlannerGridRow) => {
        setPlannerRows((prev) => {
            if (prev.some((r) => r.rowKey === row.rowKey)) return prev;
            return [...prev, row];
        });
    }, []);

    const changeRowEmployee = useCallback(
        (currentRowKey: string, employeeId: string, employeeName: string, projectId: string) => {
            const newRowKey = rowKey(employeeId, projectId);
            setPlannerRows((prev) => {
                const idx = prev.findIndex((r) => r.rowKey === currentRowKey);
                if (idx < 0) return prev;
                if (prev.some((r) => r.rowKey === newRowKey && r.rowKey !== currentRowKey)) {
                    return prev;
                }

                const old = prev[idx];
                const newWeekCells = Object.fromEntries(
                    Object.entries(old.weekCells).map(([week, cell]) => [
                        week,
                        { ...cell, employeeId },
                    ])
                );

                const next = [...prev];
                next[idx] = {
                    ...old,
                    rowKey: newRowKey,
                    employeeId,
                    employeeName,
                    weekCells: newWeekCells,
                };
                return next;
            });

            const oldRow = plannerRows.find((r) => r.rowKey === currentRowKey);
            if (oldRow) {
                for (const week of Object.keys(oldRow.weekCells)) {
                    const oldKey = cellKey(oldRow.employeeId, oldRow.projectId, week);
                    const dirty = dirtyRef.current.get(oldKey);
                    if (dirty) {
                        dirtyRef.current.delete(oldKey);
                        dirtyRef.current.set(cellKey(employeeId, projectId, week), {
                            ...dirty,
                            employeeId,
                        });
                    }
                }
                syncDirtyCount();
            }
        },
        [plannerRows]
    );

    const changeRowProject = useCallback(
        (
            currentRowKey: string,
            projectId: string,
            projectName: string,
            projectCode: string
        ) => {
            setPlannerRows((prev) => {
                const idx = prev.findIndex((r) => r.rowKey === currentRowKey);
                if (idx < 0) return prev;

                const old = prev[idx];
                const newRowKey = old.employeeId
                    ? rowKey(old.employeeId, projectId)
                    : currentRowKey;

                if (
                    old.employeeId &&
                    prev.some((r) => r.rowKey === newRowKey && r.rowKey !== currentRowKey)
                ) {
                    return prev;
                }

                const newWeekCells = Object.fromEntries(
                    Object.entries(old.weekCells).map(([week, cell]) => [
                        week,
                        { ...cell, projectId },
                    ])
                );

                const next = [...prev];
                next[idx] = {
                    ...old,
                    rowKey: newRowKey,
                    projectId,
                    projectName,
                    projectCode,
                    weekCells: newWeekCells,
                };
                return next;
            });

            const oldRow = plannerRows.find((r) => r.rowKey === currentRowKey);
            if (oldRow?.employeeId) {
                for (const week of Object.keys(oldRow.weekCells)) {
                    const oldKey = cellKey(oldRow.employeeId, oldRow.projectId, week);
                    const dirty = dirtyRef.current.get(oldKey);
                    if (dirty) {
                        dirtyRef.current.delete(oldKey);
                        dirtyRef.current.set(cellKey(oldRow.employeeId, projectId, week), {
                            ...dirty,
                            projectId,
                        });
                    }
                }
                syncDirtyCount();
            }
        },
        [plannerRows]
    );

    const removePlannerRow = useCallback((rowKeyToRemove: string) => {
        setPlannerRows((prev) => prev.filter((r) => r.rowKey !== rowKeyToRemove));
    }, []);

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
        appendPlannerRow,
        changeRowEmployee,
        changeRowProject,
        removePlannerRow,
    };
}
