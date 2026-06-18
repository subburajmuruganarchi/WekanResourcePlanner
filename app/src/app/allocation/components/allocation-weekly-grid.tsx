import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    AllCommunityModule,
    ModuleRegistry,
    type CellClassParams,
    type ColDef,
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

export interface AllocationGridRow extends WeeklyPlannerGridRow {
    employeeRole: string;
}

function formatHours(n: number): string {
    if (n === 0) return '';
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

interface AllocationWeeklyGridProps {
    rows: AllocationGridRow[];
    weeks: string[];
    canEdit: boolean;
    dirtyKeys: Set<string>;
    onPlannedHoursChange: (row: WeeklyPlannerGridRow, weekStart: string, hours: number) => void;
    loading?: boolean;
}

export function AllocationWeeklyGrid({
    rows,
    weeks,
    canEdit,
    dirtyKeys,
    onPlannedHoursChange,
    loading,
}: AllocationWeeklyGridProps) {
    const gridRef = useRef<AgGridReact<AllocationGridRow>>(null);

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

    const weekColumnDefs = useMemo((): ColDef<AllocationGridRow>[] => {
        return weeks.map((weekStart) => {
            const header = format(parseISO(weekStart), 'd MMM');
            return {
                colId: `week_${weekStart}`,
                headerName: header,
                headerTooltip: weekStart,
                headerClass: 'ra-header-week',
                width: 72,
                minWidth: 64,
                editable: canEdit,
                type: 'numericColumn',
                filter: false,
                sortable: false,
                suppressMovable: true,
                cellClass: 'ra-week-cell',
                valueGetter: (params) => params.data?.weekCells[weekStart]?.plannedHours ?? 0,
                valueFormatter: (p) => formatHours(Number(p.value ?? 0)),
                valueSetter: (params: ValueSetterParams<AllocationGridRow>) => {
                    if (!params.data || !canEdit) return false;
                    const raw = params.newValue;
                    const num =
                        typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').trim());
                    if (Number.isNaN(num)) return false;
                    onPlannedHoursChange(params.data, weekStart, num);
                    return true;
                },
                cellClassRules: {
                    'ra-cell-dirty': (p: CellClassParams<AllocationGridRow>) => {
                        if (!p.data) return false;
                        return dirtyKeys.has(
                            cellKey(p.data.employeeId, p.data.projectId, weekStart)
                        );
                    },
                    'ra-cell-filled': (p: CellClassParams<AllocationGridRow>) =>
                        Number(p.value ?? 0) > 0,
                    'ra-cell-over': (p: CellClassParams<AllocationGridRow>) =>
                        !!p.data && isOverAllocated(p.data.employeeId, weekStart),
                },
            };
        });
    }, [weeks, canEdit, dirtyKeys, onPlannedHoursChange, isOverAllocated]);

    const columnDefs = useMemo((): ColDef<AllocationGridRow>[] => {
        const pinned: ColDef<AllocationGridRow>[] = [
            {
                field: 'projectName',
                headerName: 'Project',
                headerClass: 'ra-header-project',
                pinned: 'left',
                width: 200,
                minWidth: 160,
                lockPinned: true,
                suppressMovable: true,
                editable: false,
                cellClass: 'ra-pinned-project',
                filter: 'agTextColumnFilter',
            },
            {
                field: 'employeeName',
                headerName: 'Resource',
                headerClass: 'ra-header-resource',
                pinned: 'left',
                width: 180,
                minWidth: 150,
                lockPinned: true,
                suppressMovable: true,
                editable: false,
                cellClass: 'ra-pinned-resource',
                filter: 'agTextColumnFilter',
            },
            {
                field: 'employeeRole',
                headerName: 'Resource Role',
                headerClass: 'ra-header-resource',
                pinned: 'left',
                width: 160,
                minWidth: 130,
                lockPinned: true,
                suppressMovable: true,
                editable: false,
                cellClass: 'ra-pinned-role',
                filter: 'agTextColumnFilter',
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
        (params: { data: AllocationGridRow }) => params.data.rowKey,
        []
    );

    return (
        <div
            className="ra-grid ag-theme-quartz w-full rounded-xl border border-gray-300 overflow-hidden shadow-sm"
            style={{ height: 'min(72vh, 680px)', width: '100%' }}
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
