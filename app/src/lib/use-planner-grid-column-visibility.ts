import { useCallback, useState } from 'react';

export type PlannerCollapsibleColumn = 'projectType' | 'employeeRole';

const STORAGE_KEY = 'r360.planner.grid.collapsedColumns';

function readStoredCollapsed(): Set<PlannerCollapsibleColumn> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(
            parsed.filter(
                (v): v is PlannerCollapsibleColumn =>
                    v === 'projectType' || v === 'employeeRole'
            )
        );
    } catch {
        return new Set();
    }
}

function persistCollapsed(collapsed: Set<PlannerCollapsibleColumn>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
    } catch {
        // ignore quota / private mode
    }
}

/** Shared collapse state for Weekly Planner + Resource Allocation grids. */
export function usePlannerGridColumnVisibility() {
    const [collapsed, setCollapsed] = useState<Set<PlannerCollapsibleColumn>>(readStoredCollapsed);

    const isExpanded = useCallback(
        (column: PlannerCollapsibleColumn) => !collapsed.has(column),
        [collapsed]
    );

    const toggle = useCallback((column: PlannerCollapsibleColumn) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(column)) next.delete(column);
            else next.add(column);
            persistCollapsed(next);
            return next;
        });
    }, []);

    return { isExpanded, toggle, collapsed };
}
