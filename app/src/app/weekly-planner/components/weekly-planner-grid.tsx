import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    AllCommunityModule,
    ModuleRegistry,
    type CellClassParams,
    type ColDef,
    type ColGroupDef,
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
import '../weekly-planner-grid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

function formatHours(n: number): string {
    if (n === 0) return '—';
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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

interface WeeklyPlannerGridProps {
    rows: WeeklyPlannerGridRow[];
    weeks: string[];
    canEdit: boolean;
    dirtyKeys: Set<string>;
    onPlannedHoursChange: (row: WeeklyPlannerGridRow, weekStart: string, hours: number) => void;
    onSelectionChange?: (row: WeeklyPlannerGridRow | null) => void;
    loading?: boolean;
}

export function WeeklyPlannerGrid({
    rows,
    weeks,
    canEdit,
    dirtyKeys,
    onPlannedHoursChange,
    onSelectionChange,
    loading,
}: WeeklyPlannerGridProps) {
    const gridRef = useRef<AgGridReact<WeeklyPlannerGridRow>>(null);

    const employeeWeekTotals = useMemo(
        () => computeEmployeeWeekTotals(rows, weeks),
        [rows, weeks]
    );

    const isOverAllocated = useCallback(
        (employeeId: string, weekStart: string) => {
            const total = employeeWeekTotals.get(`${employeeId}:${weekStart}`) ?? 0;
            return total > DEFAULT_WEEKLY_CAPACITY_HOURS;
        },
        [employeeWeekTotals]
    );

    const utilizationPercent = useCallback(
        (employeeId: string, weekStart: string) => {
            const total = employeeWeekTotals.get(`${employeeId}:${weekStart}`) ?? 0;
            return DEFAULT_WEEKLY_CAPACITY_HOURS > 0
                ? (total / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100
                : 0;
        },
        [employeeWeekTotals]
    );

    const weekColumnDefs = useMemo((): (ColDef<WeeklyPlannerGridRow> | ColGroupDef<WeeklyPlannerGridRow>)[] => {
        return weeks.map((weekStart) => {
            const header = format(parseISO(weekStart), 'MMM d');
            const getCell = (data: WeeklyPlannerGridRow | undefined) =>
                data?.weekCells[weekStart];

            const planCol: ColDef<WeeklyPlannerGridRow> = {
                colId: `plan_${weekStart}`,
                headerName: 'Plan',
                width: 64,
                minWidth: 56,
                editable: canEdit,
                type: 'numericColumn',
                filter: false,
                sortable: false,
                suppressMovable: true,
                valueGetter: (params) => getCell(params.data)?.plannedHours ?? 0,
                valueSetter: (params: ValueSetterParams<WeeklyPlannerGridRow>) => {
                    if (!params.data || !canEdit) return false;
                    const raw = params.newValue;
                    const num =
                        typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
                    if (Number.isNaN(num)) return false;
                    onPlannedHoursChange(params.data, weekStart, num);
                    return true;
                },
                tooltipValueGetter: (p) => cellTooltip(getCell(p.data)),
                cellClassRules: {
                    'wp-cell-dirty': (p: CellClassParams<WeeklyPlannerGridRow>) => {
                        if (!p.data) return false;
                        return dirtyKeys.has(
                            cellKey(p.data.employeeId, p.data.projectId, weekStart)
                        );
                    },
                    'wp-cell-over': (p: CellClassParams<WeeklyPlannerGridRow>) =>
                        !!p.data && isOverAllocated(p.data.employeeId, weekStart),
                    'wp-cell-high-util': (p: CellClassParams<WeeklyPlannerGridRow>) => {
                        if (!p.data) return false;
                        const util = utilizationPercent(p.data.employeeId, weekStart);
                        return util >= 80 && !isOverAllocated(p.data.employeeId, weekStart);
                    },
                    'wp-cell-bench': (p: CellClassParams<WeeklyPlannerGridRow>) => {
                        if (!p.data) return false;
                        const total =
                            employeeWeekTotals.get(`${p.data.employeeId}:${weekStart}`) ?? 0;
                        return total === 0;
                    },
                },
            };

            const actualCol: ColDef<WeeklyPlannerGridRow> = {
                colId: `actual_${weekStart}`,
                headerName: 'Act',
                headerTooltip: 'Approved time entries (read-only)',
                width: 56,
                minWidth: 48,
                editable: false,
                type: 'numericColumn',
                filter: false,
                sortable: false,
                suppressMovable: true,
                valueGetter: (params) => getCell(params.data)?.actualHours ?? 0,
                valueFormatter: (p) => formatHours(Number(p.value ?? 0)),
                tooltipValueGetter: (p) => cellTooltip(getCell(p.data)),
                cellClass: 'wp-cell-actual',
            };

            const deltaCol: ColDef<WeeklyPlannerGridRow> = {
                colId: `delta_${weekStart}`,
                headerName: 'Δ',
                headerTooltip: 'Actual − planned (positive = overrun on this project)',
                width: 52,
                minWidth: 44,
                editable: false,
                filter: false,
                sortable: false,
                suppressMovable: true,
                valueGetter: (params) => {
                    const cell = getCell(params.data);
                    if (!cell) return 0;
                    return cell.deltaHours ?? cell.actualHours - cell.plannedHours;
                },
                valueFormatter: (p) => {
                    const v = Number(p.value ?? 0);
                    if (Math.abs(v) < 0.01) return '—';
                    const sign = v > 0 ? '+' : '';
                    return `${sign}${formatHours(v)}`;
                },
                tooltipValueGetter: (p) => cellTooltip(getCell(p.data)),
                cellClassRules: {
                    'wp-cell-variance-over': (p) => Number(p.value ?? 0) > 0.01,
                    'wp-cell-variance-under': (p) => Number(p.value ?? 0) < -0.01,
                },
            };

            return {
                groupId: `week_${weekStart}`,
                headerName: header,
                headerTooltip: weekStart,
                marryChildren: true,
                children: [planCol, actualCol, deltaCol],
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

    const columnDefs = useMemo((): (ColDef<WeeklyPlannerGridRow> | ColGroupDef<WeeklyPlannerGridRow>)[] => {
        const pinned: ColDef<WeeklyPlannerGridRow>[] = [
            {
                field: 'employeeName',
                headerName: 'Resource',
                pinned: 'left',
                width: 160,
                minWidth: 140,
                lockPinned: true,
                suppressMovable: true,
                cellClass: 'wp-pinned-cell',
                filter: 'agTextColumnFilter',
            },
            {
                field: 'projectName',
                headerName: 'Project',
                pinned: 'left',
                width: 180,
                minWidth: 140,
                lockPinned: true,
                suppressMovable: true,
                cellClass: 'wp-pinned-cell',
                filter: 'agTextColumnFilter',
            },
            {
                field: 'projectCode',
                headerName: 'Code',
                pinned: 'left',
                width: 100,
                minWidth: 80,
                lockPinned: true,
                suppressMovable: true,
                cellClass: 'wp-pinned-cell',
            },
        ];
        return [...pinned, ...weekColumnDefs];
    }, [weekColumnDefs]);

    const defaultColDef = useMemo<ColDef>(
        () => ({
            resizable: true,
            sortable: true,
            filter: false,
        }),
        []
    );

    const getRowId = useCallback(
        (params: { data: WeeklyPlannerGridRow }) => params.data.rowKey,
        []
    );

    return (
        <div
            className="wp-grid ag-theme-quartz w-full rounded-xl border border-gray-200 overflow-hidden"
            style={{ height: 'min(70vh, 640px)', width: '100%' }}
        >
            <AgGridReact<WeeklyPlannerGridRow>
                ref={gridRef}
                rowData={rows}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                getRowId={getRowId}
                loading={loading}
                animateRows={false}
                suppressRowClickSelection={false}
                rowSelection="single"
                onSelectionChanged={() => {
                    const selected = gridRef.current?.api.getSelectedRows()?.[0] ?? null;
                    onSelectionChange?.(selected ?? null);
                }}
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
