import type { ColDef, ColDefField } from 'ag-grid-community';
import { CollapsibleColumnHeader } from './collapsible-column-header';
import type { PlannerCollapsibleColumn } from '@/lib/use-planner-grid-column-visibility';

const COLLAPSED_WIDTH = 36;
const TYPE_EXPANDED_WIDTH = 110;
const ROLE_EXPANDED_WIDTH = 160;

function collapsedCellClass(expanded: boolean, base = 'wp-pinned-cell'): string {
    return expanded ? base : `${base} wp-col-collapsed`;
}

function collapsedValueFormatter(expanded: boolean) {
    return (params: { value?: string | null }) => {
        if (!expanded) return '';
        return params.value || '—';
    };
}

function collapsedTooltip(expanded: boolean, label: string) {
    return (params: { value?: string | null }) => {
        if (expanded) return undefined;
        const value = params.value?.trim();
        if (!value || value === '—') return undefined;
        return `${label}: ${value}`;
    };
}

interface CollapsibleColumnOptions {
    isExpanded: (column: PlannerCollapsibleColumn) => boolean;
    toggle: (column: PlannerCollapsibleColumn) => void;
}

export function buildProjectTypeColumnDef<T extends { projectType?: string }>(
    opts: CollapsibleColumnOptions,
    extra: Partial<ColDef<T>> = {}
): ColDef<T> {
    const expanded = opts.isExpanded('projectType');

    return {
        colId: 'projectType',
        field: 'projectType' as ColDefField<T>,
        headerName: 'Type',
        headerComponent: CollapsibleColumnHeader,
        headerComponentParams: {
            label: 'Type',
            expanded,
            onToggle: () => opts.toggle('projectType'),
        },
        pinned: 'left',
        width: expanded ? TYPE_EXPANDED_WIDTH : COLLAPSED_WIDTH,
        minWidth: expanded ? 90 : COLLAPSED_WIDTH,
        maxWidth: expanded ? 200 : COLLAPSED_WIDTH,
        lockPinned: true,
        suppressMovable: true,
        editable: false,
        resizable: expanded,
        sortable: expanded,
        filter: false,
        cellClass: collapsedCellClass(expanded),
        valueFormatter: collapsedValueFormatter(expanded),
        tooltipValueGetter: collapsedTooltip(expanded, 'Type'),
        sort: expanded ? 'asc' : undefined,
        sortIndex: expanded ? 1 : undefined,
        ...extra,
    };
}

export function buildEmployeeRoleColumnDef<T extends { employeeRole?: string }>(
    opts: CollapsibleColumnOptions,
    extra: Partial<ColDef<T>> = {}
): ColDef<T> {
    const expanded = opts.isExpanded('employeeRole');

    return {
        colId: 'employeeRole',
        field: 'employeeRole' as ColDefField<T>,
        headerName: 'Resource Role',
        headerComponent: CollapsibleColumnHeader,
        headerComponentParams: {
            label: 'Resource Role',
            expanded,
            onToggle: () => opts.toggle('employeeRole'),
        },
        pinned: 'left',
        width: expanded ? ROLE_EXPANDED_WIDTH : COLLAPSED_WIDTH,
        minWidth: expanded ? 130 : COLLAPSED_WIDTH,
        maxWidth: expanded ? 240 : COLLAPSED_WIDTH,
        lockPinned: true,
        suppressMovable: true,
        editable: false,
        resizable: expanded,
        sortable: expanded,
        filter: false,
        cellClass: collapsedCellClass(expanded),
        valueFormatter: collapsedValueFormatter(expanded),
        tooltipValueGetter: collapsedTooltip(expanded, 'Resource Role'),
        ...extra,
    };
}
