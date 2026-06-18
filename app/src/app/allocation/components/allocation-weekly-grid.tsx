import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    AllCommunityModule,
    ModuleRegistry,
    type CellClassParams,
    type ColDef,
    type EditableCallbackParams,
    type ValueSetterParams,
} from 'ag-grid-community';
import { format, parseISO } from 'date-fns';
import type { WeeklyPlannerGridRow } from '@/types/weekly-allocation';
import {
    computeEmployeeWeekTotals,
    cellKey,
    DEFAULT_WEEKLY_CAPACITY_HOURS,
} from '@/lib/weekly-grid-pivot';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '../allocation-grid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

export interface EmployeeOption {
    id: string;
    name: string;
    role: string;
}

export interface ProjectOption {
    id: string;
    name: string;
    code: string;
}

export interface AllocationGridRow extends WeeklyPlannerGridRow {
    employeeRole: string;
    isDraft?: boolean;
    isNewRow?: boolean;
}

function formatHours(n: number): string {
    if (n === 0) return '';
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function isProjectEditable(row: AllocationGridRow | undefined): boolean {
    if (!row) return false;
    return !!row.isNewRow || row.rowKey.startsWith('draft:');
}

interface AllocationWeeklyGridProps {
    rows: AllocationGridRow[];
    weeks: string[];
    employees: EmployeeOption[];
    projects: ProjectOption[];
    canEdit: boolean;
    dirtyKeys: Set<string>;
    onPlannedHoursChange: (row: WeeklyPlannerGridRow, weekStart: string, hours: number) => void;
    onEmployeeChange: (row: AllocationGridRow, employeeId: string) => void;
    onProjectChange: (row: AllocationGridRow, projectId: string) => void;
    loading?: boolean;
}

export function AllocationWeeklyGrid({
    rows,
    weeks,
    employees,
    projects,
    canEdit,
    dirtyKeys,
    onPlannedHoursChange,
    onEmployeeChange,
    onProjectChange,
    loading,
}: AllocationWeeklyGridProps) {
    const gridRef = useRef<AgGridReact<AllocationGridRow>>(null);

    const employeeIds = useMemo(() => employees.map((e) => e.id), [employees]);
    const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
    const employeeNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const e of employees) map.set(e.id, e.name);
        return map;
    }, [employees]);
    const projectNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of projects) map.set(p.id, p.name);
        return map;
    }, [projects]);

    const employeeWeekTotals = useMemo(
        () => computeEmployeeWeekTotals(rows, weeks),
        [rows, weeks]
    );

    const isOverAllocated = useCallback(
        (employeeId: string, weekStart: string) => {
            if (!employeeId) return false;
            const total = employeeWeekTotals.get(`${employeeId}:${weekStart}`) ?? 0;
            return total > DEFAULT_WEEKLY_CAPACITY_HOURS;
        },
        [employeeWeekTotals]
    );

    const weekColumnDefs = useMemo((): ColDef<AllocationGridRow>[] => {
        return weeks.map((weekStart) => {
            const header = format(parseISO(weekStart), 'd MMM').toUpperCase();
            return {
                colId: `week_${weekStart}`,
                headerName: header,
                headerTooltip: weekStart,
                headerClass: 'ra-header-week',
                width: 76,
                minWidth: 68,
                editable: (params) => canEdit && !!params.data?.employeeId && !!params.data?.projectId,
                type: 'numericColumn',
                filter: false,
                sortable: false,
                suppressMovable: true,
                cellClass: 'ra-week-cell',
                valueGetter: (params) => params.data?.weekCells[weekStart]?.plannedHours ?? 0,
                valueFormatter: (p) => formatHours(Number(p.value ?? 0)),
                valueSetter: (params: ValueSetterParams<AllocationGridRow>) => {
                    if (!params.data?.employeeId || !params.data?.projectId || !canEdit) return false;
                    const raw = params.newValue;
                    const num =
                        typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
                    if (Number.isNaN(num)) return false;
                    onPlannedHoursChange(params.data, weekStart, num);
                    return true;
                },
                cellClassRules: {
                    'ra-cell-dirty': (p: CellClassParams<AllocationGridRow>) => {
                        if (!p.data?.employeeId) return false;
                        return dirtyKeys.has(
                            cellKey(p.data.employeeId, p.data.projectId, weekStart)
                        );
                    },
                    'ra-cell-filled': (p: CellClassParams<AllocationGridRow>) =>
                        Number(p.value ?? 0) > 0,
                    'ra-cell-over': (p: CellClassParams<AllocationGridRow>) =>
                        !!p.data?.employeeId &&
                        isOverAllocated(p.data.employeeId, weekStart),
                },
            };
        });
    }, [weeks, canEdit, dirtyKeys, onPlannedHoursChange, isOverAllocated]);

    const columnDefs = useMemo((): ColDef<AllocationGridRow>[] => {
        const pinned: ColDef<AllocationGridRow>[] = [
            {
                colId: 'project',
                field: 'projectId',
                headerName: 'Project',
                headerClass: 'ra-header-project',
                pinned: 'left',
                width: 200,
                minWidth: 160,
                lockPinned: true,
                suppressMovable: true,
                editable: (params: EditableCallbackParams<AllocationGridRow>) =>
                    canEdit && isProjectEditable(params.data),
                cellClass: 'ra-pinned-project',
                filter: false,
                sort: 'asc',
                sortIndex: 0,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: ['', ...projectIds],
                },
                valueFormatter: (params) => {
                    if (!params.value) {
                        return params.data?.isNewRow ? 'Select project…' : '—';
                    }
                    return (
                        projectNameById.get(String(params.value)) ??
                        params.data?.projectName ??
                        '—'
                    );
                },
                valueSetter: (params: ValueSetterParams<AllocationGridRow>) => {
                    if (!params.data || !canEdit) return false;
                    const newId = String(params.newValue ?? '').trim();
                    if (!newId || newId === params.data.projectId) return false;
                    onProjectChange(params.data, newId);
                    return true;
                },
            },
            {
                colId: 'resource',
                field: 'employeeId',
                headerName: 'Resource',
                headerClass: 'ra-header-resource',
                pinned: 'left',
                width: 200,
                minWidth: 170,
                lockPinned: true,
                suppressMovable: true,
                editable: (params: EditableCallbackParams<AllocationGridRow>) =>
                    canEdit && !!params.data?.projectId,
                cellClass: 'ra-pinned-resource',
                filter: false,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: ['', ...employeeIds],
                },
                valueFormatter: (params) => {
                    if (!params.value) {
                        return params.data?.isDraft || params.data?.isNewRow
                            ? 'Select resource…'
                            : '—';
                    }
                    return employeeNameById.get(String(params.value)) ?? params.data?.employeeName ?? '—';
                },
                valueSetter: (params: ValueSetterParams<AllocationGridRow>) => {
                    if (!params.data || !canEdit || !params.data.projectId) return false;
                    const newId = String(params.newValue ?? '').trim();
                    if (!newId) return false;
                    if (newId === params.data.employeeId) return false;
                    onEmployeeChange(params.data, newId);
                    return true;
                },
            },
            {
                field: 'employeeRole',
                headerName: 'Resource Role',
                headerClass: 'ra-header-resource',
                pinned: 'left',
                width: 180,
                minWidth: 150,
                lockPinned: true,
                suppressMovable: true,
                editable: false,
                cellClass: 'ra-pinned-role',
                filter: false,
                valueFormatter: (params) => params.value || '—',
            },
        ];
        return [...pinned, ...weekColumnDefs];
    }, [
        weekColumnDefs,
        canEdit,
        employeeIds,
        projectIds,
        employeeNameById,
        projectNameById,
        onEmployeeChange,
        onProjectChange,
    ]);

    const defaultColDef = useMemo<ColDef>(
        () => ({
            resizable: true,
            sortable: true,
            filter: false,
        }),
        []
    );

    const getRowId = useCallback(
        (params: { data: AllocationGridRow }) => params.data.rowKey,
        []
    );

    return (
        <div
            className="ra-grid ag-theme-quartz w-full rounded-xl border border-gray-300 overflow-hidden shadow-sm"
            style={{ height: 'min(78vh, 720px)', width: '100%' }}
        >
            <AgGridReact<AllocationGridRow>
                ref={gridRef}
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                loading={loading}
                animateRows={false}
                enableCellTextSelection
                ensureDomOrder={false}
                rowBuffer={20}
                debounceVerticalScrollbar
                suppressColumnVirtualisation={weeks.length <= 30}
                singleClickEdit={canEdit}
                stopEditingWhenCellsLoseFocus
                tooltipShowDelay={400}
            />
        </div>
    );
}
