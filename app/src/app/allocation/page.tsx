import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { Loader2, Save, Undo2, AlertCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects, useProject } from '@/lib/use-projects';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/lib/use-employees';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import { rowKey } from '@/lib/weekly-grid-pivot';
import { ProjectManagerAssignment } from './components/project-manager-assignment';
import { AllocationWeeklyGrid, type AllocationGridRow } from './components/allocation-weekly-grid';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';
import './allocation-grid.css';

function buildWeekRange(project: { startDate: string; endDate?: string } | null): {
    weekStartFrom: string;
    weekStartTo: string;
} {
    const todayStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    let from = todayStart;
    let to = addWeeks(todayStart, 11);

    if (project?.startDate) {
        from = startOfWeek(parseISO(project.startDate), { weekStartsOn: 1 });
    }
    if (project?.endDate) {
        const projectEnd = startOfWeek(parseISO(project.endDate), { weekStartsOn: 1 });
        to = projectEnd;
    }

    if (to < from) {
        to = addWeeks(from, 11);
    }

    const maxEnd = addWeeks(from, 51);
    if (to > maxEnd) {
        to = maxEnd;
    }

    return {
        weekStartFrom: format(from, 'yyyy-MM-dd'),
        weekStartTo: format(to, 'yyyy-MM-dd'),
    };
}

export function Allocation() {
    const { user } = useAuth();
    const canEditPm = user?.role === 'Admin';
    const canEditGrid = user?.role === 'Admin';

    const { projects, loading: projLoading, refetch: refetchProjects } = useProjects();
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
    const { project: selectedProject, refetch: refetchProject } = useProject(selectedProjectId);
    const { employees } = useEmployees();

    const [addEmployeeId, setAddEmployeeId] = useState('');
    const [weekWindowStart, setWeekWindowStart] = useState(0);
    const WEEKS_VISIBLE = 8;

    const grid = useWeeklyAllocationGrid({ canEdit: canEditGrid, pageSize: 500 });

    const listProject = useMemo(
        () => projects.find((p) => p.id === selectedProjectId),
        [projects, selectedProjectId]
    );

    const activeProject = useMemo(() => {
        if (selectedProject?.id === selectedProjectId) return selectedProject;
        return listProject ?? null;
    }, [selectedProject, selectedProjectId, listProject]);

    const employeeRoleMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const emp of employees) {
            map.set(
                emp.id,
                emp.jobRole || emp.position || (typeof emp.role === 'string' ? emp.role : '') || '—'
            );
        }
        return map;
    }, [employees]);

    const gridFilters = useMemo((): WeeklyGridFilters | null => {
        if (!selectedProjectId || !activeProject) return null;
        const range = buildWeekRange(activeProject);
        return {
            ...range,
            projectId: selectedProjectId,
            utilization: 'all',
        };
    }, [selectedProjectId, activeProject]);

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
            employeeRole: employeeRoleMap.get(row.employeeId) || '—',
        }));
    }, [grid.plannerRows, employeeRoleMap]);

    const employeesNotOnGrid = useMemo(() => {
        const onGrid = new Set(grid.plannerRows.map((r) => r.employeeId));
        return employees
            .filter((e) => e.status === 'Active' && !onGrid.has(e.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, grid.plannerRows]);

    const handlePmUpdated = () => {
        refetchProject();
        refetchProjects();
    };

    const handleAddResource = useCallback(() => {
        if (!addEmployeeId || !selectedProjectId || !activeProject) return;
        const emp = employees.find((e) => e.id === addEmployeeId);
        if (!emp) return;

        const key = rowKey(addEmployeeId, selectedProjectId);
        if (grid.plannerRows.some((r) => r.rowKey === key)) return;

        grid.appendPlannerRow({
            rowKey: key,
            employeeId: addEmployeeId,
            employeeName: emp.name,
            projectId: selectedProjectId,
            projectName: activeProject.name,
            projectCode: activeProject.code,
            weekCells: {},
        });
        setAddEmployeeId('');
    }, [addEmployeeId, selectedProjectId, activeProject, employees, grid]);

    const handleSave = async () => {
        await grid.saveBulk();
    };

    return (
        <PageContainer className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Resource Allocation</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Allocate resources to projects based on skills, availability, and experience.
                </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div
                    className={
                        selectedProjectId && activeProject
                            ? canEditPm
                                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto_auto]'
                                : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto]'
                            : 'max-w-xl'
                    }
                >
                    <div className="space-y-2 min-w-0">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Select project
                        </label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="h-11 w-full rounded-xl border-gray-200 text-sm font-medium">
                                <SelectValue placeholder="Choose a project…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                                {projLoading ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                                    </div>
                                ) : (
                                    (projects || []).map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            <span className="flex items-center gap-2">
                                                <span>{project.name}</span>
                                                <span className="font-mono text-[10px] text-gray-400">
                                                    {project.code}
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedProjectId && activeProject && (
                        <>
                            <ProjectManagerAssignment
                                key={selectedProjectId}
                                projectId={selectedProjectId}
                                managerId={activeProject.managerId}
                                managerName={activeProject.managerName}
                                readOnly={!canEditPm}
                                onUpdated={handlePmUpdated}
                            />
                            <div className="space-y-2 min-w-0">
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Status
                                </label>
                                <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700">
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${
                                            activeProject.status === 'Active'
                                                ? 'bg-green-500'
                                                : activeProject.status === 'Planning'
                                                  ? 'bg-amber-500'
                                                  : 'bg-gray-400'
                                        }`}
                                    />
                                    {activeProject.status || 'Active'}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {!selectedProjectId ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-sm text-gray-500">
                    Select a project above to view and edit weekly resource allocations.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {canEditGrid && (
                                <>
                                    <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
                                        <SelectTrigger className="h-9 w-[220px] rounded-lg">
                                            <SelectValue placeholder="Add resource…" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-64">
                                            {employeesNotOnGrid.length === 0 ? (
                                                <SelectItem value="__none__" disabled>
                                                    All active employees are on the grid
                                                </SelectItem>
                                            ) : (
                                                employeesNotOnGrid.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-1"
                                        disabled={!addEmployeeId}
                                        onClick={handleAddResource}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add row
                                    </Button>
                                </>
                            )}
                            <span className="text-sm text-gray-500">
                                {displayRows.length} resource{displayRows.length === 1 ? '' : 's'}
                                {grid.weeks.length > 0 &&
                                    ` · ${format(parseISO(grid.weeks[0]), 'd MMM yyyy')} – ${format(parseISO(grid.weeks[grid.weeks.length - 1]), 'd MMM yyyy')}`}
                            </span>
                        </div>

                        {canEditGrid && (
                            <div className="flex flex-wrap gap-2">
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
                            </div>
                        )}
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

                    {grid.weeks.length > WEEKS_VISIBLE && (
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!canScrollWeeksBack}
                                onClick={() => setWeekWindowStart((s) => Math.max(0, s - WEEKS_VISIBLE))}
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
                                        Math.min(s + WEEKS_VISIBLE, grid.weeks.length - WEEKS_VISIBLE)
                                    )
                                }
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    <AllocationWeeklyGrid
                        rows={displayRows}
                        weeks={visibleWeeks.length > 0 ? visibleWeeks : grid.weeks}
                        canEdit={canEditGrid}
                        dirtyKeys={grid.dirtyKeys}
                        onPlannedHoursChange={grid.updatePlannedHours}
                        loading={grid.loading}
                    />

                    <p className="text-xs text-gray-500">
                        Enter planned hours per week for each resource. Click a cell to edit; use{' '}
                        <strong>Save changes</strong> to persist. Project Managers can view this grid in
                        read-only mode.
                    </p>
                </div>
            )}
        </PageContainer>
    );
}
