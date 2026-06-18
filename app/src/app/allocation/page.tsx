import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { Loader2, Save, Undo2, AlertCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/lib/use-projects';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/lib/use-employees';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import { rowKey } from '@/lib/weekly-grid-pivot';
import {
    AllocationWeeklyGrid,
    type AllocationGridRow,
    type EmployeeOption,
} from './components/allocation-weekly-grid';
import type { Project } from '@/types/api';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';
import './allocation-grid.css';

function buildGlobalWeekRange(projects: Project[]): {
    weekStartFrom: string;
    weekStartTo: string;
} {
    const withDates = projects.filter((p) => p.startDate);
    const todayStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    if (withDates.length === 0) {
        return {
            weekStartFrom: format(todayStart, 'yyyy-MM-dd'),
            weekStartTo: format(addWeeks(todayStart, 11), 'yyyy-MM-dd'),
        };
    }

    let from = startOfWeek(parseISO(withDates[0].startDate), { weekStartsOn: 1 });
    let to = withDates[0].endDate
        ? startOfWeek(parseISO(withDates[0].endDate), { weekStartsOn: 1 })
        : addWeeks(from, 11);

    for (const p of withDates) {
        const ps = startOfWeek(parseISO(p.startDate), { weekStartsOn: 1 });
        const pe = p.endDate
            ? startOfWeek(parseISO(p.endDate), { weekStartsOn: 1 })
            : addWeeks(ps, 11);
        if (ps < from) from = ps;
        if (pe > to) to = pe;
    }

    const maxEnd = addWeeks(from, 51);
    if (to > maxEnd) to = maxEnd;
    if (to < from) to = addWeeks(from, 11);

    return {
        weekStartFrom: format(from, 'yyyy-MM-dd'),
        weekStartTo: format(to, 'yyyy-MM-dd'),
    };
}

function employeeRoleLabel(emp: {
    jobRole?: string;
    position?: string;
    role?: string;
}): string {
    return emp.jobRole || emp.position || (typeof emp.role === 'string' ? emp.role : '') || '—';
}

export function Allocation() {
    const { user } = useAuth();
    const canEditGrid = user?.role === 'Admin';

    const { projects, loading: projLoading } = useProjects();
    const { employees } = useEmployees();

    const [weekWindowStart, setWeekWindowStart] = useState(0);
    const WEEKS_VISIBLE = 8;

    const grid = useWeeklyAllocationGrid({ canEdit: canEditGrid, pageSize: 500 });

    const employeeOptions = useMemo((): EmployeeOption[] => {
        return employees
            .filter((e) => e.status === 'Active')
            .map((e) => ({
                id: e.id,
                name: e.name,
                role: employeeRoleLabel(e),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [employees]);

    const employeeRoleMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const e of employeeOptions) map.set(e.id, e.role);
        return map;
    }, [employeeOptions]);

    const gridFilters = useMemo((): WeeklyGridFilters | null => {
        if (projLoading || projects.length === 0) return null;
        const range = buildGlobalWeekRange(projects);
        return {
            ...range,
            utilization: 'all',
        };
    }, [projects, projLoading]);

    useEffect(() => {
        if (!gridFilters) return;
        setWeekWindowStart(0);
        void grid.fetchGrid(gridFilters, 1);
    }, [gridFilters]); // eslint-disable-line react-hooks/exhaustive-deps

    const visibleWeeks = useMemo(() => {
        if (grid.weeks.length === 0) return [];
        const start = Math.min(weekWindowStart, Math.max(0, grid.weeks.length - WEEKS_VISIBLE));
        return grid.weeks.slice(start, start + WEEKS_VISIBLE);
    }, [grid.weeks, weekWindowStart]);

    const canScrollWeeksBack = weekWindowStart > 0;
    const canScrollWeeksForward = weekWindowStart + WEEKS_VISIBLE < grid.weeks.length;

    const displayRows = useMemo((): AllocationGridRow[] => {
        return grid.plannerRows.map((row) => ({
            ...row,
            employeeRole: row.employeeId
                ? employeeRoleMap.get(row.employeeId) || '—'
                : '—',
            isDraft: row.rowKey.startsWith('draft:'),
        }));
    }, [grid.plannerRows, employeeRoleMap]);

    const handleEmployeeChange = useCallback(
        (row: AllocationGridRow, employeeId: string) => {
            const emp = employeeOptions.find((e) => e.id === employeeId);
            if (!emp) return;

            const newKey = rowKey(employeeId, row.projectId);
            if (
                grid.plannerRows.some(
                    (r) => r.rowKey === newKey && r.rowKey !== row.rowKey
                )
            ) {
                return;
            }

            grid.changeRowEmployee(row.rowKey, employeeId, emp.name, row.projectId);
        },
        [employeeOptions, grid]
    );

    const handleAddRow = useCallback(() => {
        const lastRow = grid.plannerRows[grid.plannerRows.length - 1];
        const refProject =
            projects.find((p) => p.id === lastRow?.projectId) ??
            projects.find((p) => p.status === 'Active' || p.status === 'Planning') ??
            projects[0];

        if (!refProject) return;

        const draftKey = `draft:${Date.now()}`;
        grid.appendPlannerRow({
            rowKey: draftKey,
            employeeId: '',
            employeeName: '',
            projectId: refProject.id,
            projectName: refProject.name,
            projectCode: refProject.code,
            weekCells: {},
        });
    }, [grid, projects]);

    const handleSave = async () => {
        const incomplete = grid.plannerRows.some((r) => !r.employeeId);
        if (incomplete) {
            grid.plannerRows
                .filter((r) => !r.employeeId)
                .forEach((r) => grid.removePlannerRow(r.rowKey));
        }
        await grid.saveBulk();
    };

    return (
        <PageContainer className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Resource Allocation</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Allocate resources to projects based on skills, availability, and experience.
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {canEditGrid && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1"
                                onClick={handleAddRow}
                                disabled={projLoading || projects.length === 0}
                            >
                                <Plus className="w-4 h-4" />
                                Add row
                            </Button>
                        )}
                        <span className="text-sm text-gray-500">
                            {displayRows.filter((r) => r.employeeId).length} resource
                            {displayRows.filter((r) => r.employeeId).length === 1 ? '' : 's'}
                            {grid.weeks.length > 0 &&
                                ` · ${format(parseISO(grid.weeks[0]), 'd MMM yyyy')} – ${format(parseISO(grid.weeks[grid.weeks.length - 1]), 'd MMM yyyy')}`}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {grid.weeks.length > WEEKS_VISIBLE && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={!canScrollWeeksBack}
                                    onClick={() =>
                                        setWeekWindowStart((s) => Math.max(0, s - WEEKS_VISIBLE))
                                    }
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-xs text-gray-500">
                                    Weeks {weekWindowStart + 1}–
                                    {Math.min(weekWindowStart + WEEKS_VISIBLE, grid.weeks.length)} of{' '}
                                    {grid.weeks.length}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={!canScrollWeeksForward}
                                    onClick={() =>
                                        setWeekWindowStart((s) =>
                                            Math.min(
                                                s + WEEKS_VISIBLE,
                                                grid.weeks.length - WEEKS_VISIBLE
                                            )
                                        )
                                    }
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </>
                        )}

                        {canEditGrid && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => grid.discardChanges()}
                                    disabled={!grid.hasDirty || grid.saving}
                                >
                                    <Undo2 className="w-4 h-4 mr-1" />
                                    Discard
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => void handleSave()}
                                    disabled={!grid.hasDirty || grid.saving}
                                    className="bg-brand-500 hover:bg-brand-600"
                                >
                                    {grid.saving ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-1" />
                                    )}
                                    Save changes
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {grid.error && (
                    <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">Could not load allocation grid</p>
                            <p>{grid.error}</p>
                            {grid.error.includes('disabled') && (
                                <p className="mt-1 text-xs">
                                    Enable{' '}
                                    <code className="bg-red-100 px-1 rounded">
                                        FEATURE_WEEKLY_ALLOCATIONS_ENABLED=true
                                    </code>{' '}
                                    on the backend and restart.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {grid.saveMessage && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                        {grid.saveMessage}
                    </p>
                )}

                <AllocationWeeklyGrid
                    rows={displayRows}
                    weeks={visibleWeeks.length > 0 ? visibleWeeks : grid.weeks}
                    employees={employeeOptions}
                    canEdit={canEditGrid}
                    dirtyKeys={grid.dirtyKeys}
                    onPlannedHoursChange={grid.updatePlannedHours}
                    onEmployeeChange={handleEmployeeChange}
                    loading={grid.loading || projLoading}
                />
            </div>
        </PageContainer>
    );
}
