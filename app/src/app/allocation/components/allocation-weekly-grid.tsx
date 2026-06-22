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
import type { WeeklyAllocationCell, WeeklyPlannerGridRow } from '@/types/weekly-allocation';
import {
    computeEmployeeWeekTotals,
    cellKey,
    DEFAULT_WEEKLY_CAPACITY_HOURS,
} from '@/lib/weekly-grid-pivot';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '../../weekly-planner/weekly-planner-grid.css';

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
    if (n === 0) return '—';
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPlanHours(n: number): string {
    if (n === 0) return '';
    return formatHours(n);
}

function cellTooltip(cell: WeeklyAllocationCell | undefined): string {
    if (!cell) return 'No allocation for this week';
    const plan = cell.plannedHours;
    const actual = cell.actualHours;
    const forecast = cell.forecastHours;
    const planVar = cell.varianceHours ?? plan - actual;
    const delta = cell.deltaHours ?? actual - plan;
    const lines = [
        `Planned: ${formatHours(plan)}h`,
        `Actual (approved time): ${formatHours(actual)}h`,
        `Forecast: ${formatHours(forecast)}h`,
        `Variance (plan − actual): ${formatHours(planVar)}h`,
        `Delta (actual − plan): ${delta >= 0 ? '+' : ''}${formatHours(delta)}h`,
    ];
    if (cell.variancePercent !== undefined) {
        lines.push(`Variance %: ${cell.variancePercent}%`);
    }
    if (cell.isLegacy) {
        lines.push('Legacy row — actuals sync when a weekly entry exists');
    }
    return lines.join('\n');
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

    const utilizationPercent = useCallback(
        (employeeId: string, weekStart: string) => {
            if (!employeeId) return 0;
            const total = employeeWeekTotals.get(`${employeeId}:${weekStart}`) ?? 0;
            return DEFAULT_WEEKLY_CAPACITY_HOURS > 0
                ? (total / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100
                : 0;
        },
        [employeeWeekTotals]
    );

    const weekColumnDefs = useMemo((): ColDef<AllocationGridRow>[] => {
        return weeks.map((weekStart) => {
            const header = format(parseISO(weekStart), 'MMM d');
            const getCell = (data: AllocationGridRow | undefined) => data?.weekCells[weekStart];

            return {
                colId: `week_${weekStart}`,
                headerName: header,
                headerTooltip: weekStart,
                width: 72,
                minWidth: 64,
                editable: (params) =>
                    canEdit && !!params.data?.employeeId && !!params.data?.projectId,
                type: 'numericColumn',
                filter: false,
                sortable: false,
                suppressMovable: true,
                valueGetter: (params) => getCell(params.data)?.plannedHours ?? 0,
                valueFormatter: (p) => formatPlanHours(Number(p.value ?? 0)),
                valueSetter: (params: ValueSetterParams<AllocationGridRow>) => {
                    if (!params.data?.employeeId || !params.data?.projectId || !canEdit) return false;
                    const raw = params.newValue;
                    const num =
                        typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
                    if (Number.isNaN(num)) return false;
                    onPlannedHoursChange(params.data, weekStart, num);
                    return true;
                },
                tooltipValueGetter: (p) => cellTooltip(getCell(p.data)),
                cellClassRules: {
                    'wp-cell-dirty': (p: CellClassParams<AllocationGridRow>) => {
                        if (!p.data?.employeeId) return false;
                        return dirtyKeys.has(
                            cellKey(p.data.employeeId, p.data.projectId, weekStart)
                        );
                    },
                    'wp-cell-over': (p: CellClassParams<AllocationGridRow>) =>
                        !!p.data?.employeeId &&
                        isOverAllocated(p.data.employeeId, weekStart),
                    'wp-cell-high-util': (p: CellClassParams<AllocationGridRow>) => {
                        if (!p.data?.employeeId) return false;
                        const util = utilizationPercent(p.data.employeeId, weekStart);
                        return util >= 80 && !isOverAllocated(p.data.employeeId, weekStart);
                    },
                    'wp-cell-bench': (p: CellClassParams<AllocationGridRow>) => {
                        if (!p.data?.employeeId) return false;
                        const total =
                            employeeWeekTotals.get(`${p.data.employeeId}:${weekStart}`) ?? 0;
                        return total === 0;
                    },
                },
            };
        });
    }, [
        weeks,
        canEdit,
        dirtyKeys,
        onPlannedHoursChange,
        isOverAllocated,
        utilizationPercent,
        employeeWeekTotals,
    ]);

    const columnDefs = useMemo((): ColDef<AllocationGridRow>[] => {
        const pinned: ColDef<AllocationGridRow>[] = [
            {
                colId: 'project',
                field: 'projectId',
                headerName: 'Project',
                pinned: 'left',
                width: 200,
                minWidth: 160,
                lockPinned: true,
                suppressMovable: true,
                editable: (params: EditableCallbackParams<AllocationGridRow>) =>
                    canEdit && isProjectEditable(params.data),
                cellClass: 'wp-pinned-cell',
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
                field: 'projectType',
                headerName: 'Type',
                pinned: 'left',
                width: 110,
                minWidth: 90,
                lockPinned: true,
                suppressMovable: true,
                editable: false,
                cellClass: 'wp-pinned-cell',
                filter: false,
                sort: 'asc',
                sortIndex: 1,
                valueFormatter: (params) => params.value || '—',
            },
            {
                colId: 'resource',
                field: 'employeeId',
                headerName: 'Resource',
                pinned: 'left',
                width: 200,
                minWidth: 170,
                lockPinned: true,
                suppressMovable: true,
                editable: (params: EditableCallbackParams<AllocationGridRow>) =>
                    canEdit && !!params.data?.projectId,
                cellClass: 'wp-pinned-cell',
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
                pinned: 'left',
                width: 180,
                minWidth: 150,
                lockPinned: true,
                suppressMovable: true,
                editable: false,
                cellClass: 'wp-pinned-cell',
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
            className="wp-grid ag-theme-quartz w-full rounded-xl border border-gray-200 overflow-hidden"
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
                suppressColumnVirtualisation={weeks.length <= 26}
                singleClickEdit={canEdit}
                stopEditingWhenCellsLoseFocus
                tooltipShowDelay={400}
            />
        </div>
    );
}
