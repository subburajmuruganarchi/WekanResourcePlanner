import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Save, Undo2, AlertCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/lib/use-projects';
import { useAuth } from '@/lib/auth-context';
import { canEditAllocations, isExecutiveReadOnly, ROLES } from '@/lib/roles';
import { normalizeRoleName } from '@/lib/role-utils';
import { usePortfolioScope } from '@/lib/use-portfolio-scope';
import { useEmployees } from '@/lib/use-employees';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import { rowKey } from '@/lib/weekly-grid-pivot';
import { matchesPlannerGridSearch } from '@/lib/planner-grid-search';
import { subscribeWeeklyGridUpdated } from '@/lib/weekly-grid-sync';
import { PlannerGridSearchBar } from '@/components/weekly-planner/planner-grid-search-bar';
import {
    AllocationWeeklyGrid,
    type AllocationGridRow,
    type EmployeeOption,
} from './components/allocation-weekly-grid';
import { AllocationGridLegend } from './components/allocation-grid-legend';
import { AllocationDraftRow } from './components/allocation-draft-row';
import { buildPlanningWeekRange, filterWeeksFromCurrent } from '@/lib/planning-week-utils';
import { projectTypeLabel } from '@/lib/project-type-label';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';

const BENCH_PROJECT_CODE = 'BENCH';

function employeeRoleLabel(emp: {
    jobRole?: string;
    position?: string;
    role?: string;
}): string {
    return emp.jobRole || emp.position || (typeof emp.role === 'string' ? emp.role : '') || '—';
}

export function Allocation() {
    const { user } = useAuth();
    const isReadOnlyExecutive = isExecutiveReadOnly(user?.role);
    const isAdminReadOnly =
        normalizeRoleName(user?.role) === ROLES.ADMIN || isReadOnlyExecutive;
    const canEditGrid = canEditAllocations(user?.role) && !isReadOnlyExecutive;
    const { editableProjectIds } = usePortfolioScope(user?.role);

    const { projects, loading: projLoading } = useProjects();
    const { employees } = useEmployees();

    const [weekWindowStart, setWeekWindowStart] = useState(0);
    const [searchProject, setSearchProject] = useState('');
    const [searchResource, setSearchResource] = useState('');
    const [showDraftForm, setShowDraftForm] = useState(false);
    const [draftProjectId, setDraftProjectId] = useState('');
    const [draftEmployeeId, setDraftEmployeeId] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const WEEKS_VISIBLE = 8;

    const grid = useWeeklyAllocationGrid({
        canEdit: canEditGrid,
        pageSize: 500,
        fetchAllPages: true,
        allowOverAllocation: true,
        includeUnstaffedProjects: true,
    });

    const projectOptions = useMemo(
        () =>
            projects
                .map((p) => ({ id: p.id, name: p.name, code: p.code }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [projects]
    );

    const projectTypeById = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of projects) {
            map.set(p.id, projectTypeLabel(p.type, p.billingType));
        }
        return map;
    }, [projects]);

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
        if (projLoading) return null;
        const range = buildPlanningWeekRange();
        return {
            ...range,
            utilization: 'all',
            excludeBench: true,
        };
    }, [projLoading]);

    useEffect(() => {
        if (!gridFilters) return;
        setWeekWindowStart(0);
        void grid.fetchGrid(gridFilters, 1);
    }, [gridFilters]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!gridFilters) return;
        return subscribeWeeklyGridUpdated(() => {
            void grid.fetchGrid(gridFilters, 1);
        });
    }, [gridFilters, grid]);

    const planningWeeks = useMemo(() => filterWeeksFromCurrent(grid.weeks), [grid.weeks]);

    const visibleWeeks = useMemo(() => {
        if (planningWeeks.length === 0) return [];
        const start = Math.min(weekWindowStart, Math.max(0, planningWeeks.length - WEEKS_VISIBLE));
        return planningWeeks.slice(start, start + WEEKS_VISIBLE);
    }, [planningWeeks, weekWindowStart]);

    const canScrollWeeksBack = weekWindowStart > 0;
    const canScrollWeeksForward = weekWindowStart + WEEKS_VISIBLE < planningWeeks.length;

    const displayRows = useMemo((): AllocationGridRow[] => {
        return grid.plannerRows
            .filter(
                (row) =>
                    row.projectCode !== BENCH_PROJECT_CODE &&
                    row.projectName !== 'Available / Bench' &&
                    !row.rowKey.startsWith('draft:')
            )
            .map((row) => ({
                ...row,
                projectType:
                    row.projectType ||
                    projectTypeById.get(row.projectId) ||
                    '—',
                employeeRole: row.employeeId
                    ? employeeRoleMap.get(row.employeeId) || '—'
                    : '—',
                employeeName: row.employeeId
                    ? row.employeeName
                    : row.rowKey.startsWith('placeholder:')
                      ? 'Unassigned'
                      : row.employeeName,
                isDraft: false,
                isNewRow: false,
            }))
            .sort((a, b) => {
                const byProject = a.projectName.localeCompare(b.projectName, undefined, {
                    sensitivity: 'base',
                });
                if (byProject !== 0) return byProject;
                if (!a.employeeId && b.employeeId) return 1;
                if (a.employeeId && !b.employeeId) return -1;
                return a.employeeName.localeCompare(b.employeeName, undefined, {
                    sensitivity: 'base',
                });
            });
    }, [grid.plannerRows, employeeRoleMap, projectTypeById]);

    const filteredRows = useMemo(() => {
        return displayRows.filter((row) =>
            matchesPlannerGridSearch(row, {
                project: searchProject,
                resource: searchResource,
            })
        );
    }, [displayRows, searchProject, searchResource]);

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

    const handleProjectChange = useCallback(
        (row: AllocationGridRow, projectId: string) => {
            const project = projectOptions.find((p) => p.id === projectId);
            if (!project) return;

            if (row.employeeId) {
                const newKey = rowKey(row.employeeId, projectId);
                if (
                    grid.plannerRows.some(
                        (r) => r.rowKey === newKey && r.rowKey !== row.rowKey
                    )
                ) {
                    return;
                }
            }

            grid.changeRowProject(
                row.rowKey,
                project.id,
                project.name,
                project.code
            );
        },
        [projectOptions, grid]
    );

    const handleAddRow = useCallback(() => {
        setDraftProjectId('');
        setDraftEmployeeId('');
        setDraftError(null);
        setShowDraftForm(true);
    }, []);

    const handleCancelDraft = useCallback(() => {
        setShowDraftForm(false);
        setDraftProjectId('');
        setDraftEmployeeId('');
        setDraftError(null);
    }, []);

    const handleSaveDraftRow = useCallback(() => {
        const project = projectOptions.find((p) => p.id === draftProjectId);
        const emp = employeeOptions.find((e) => e.id === draftEmployeeId);
        if (!project || !emp) {
            setDraftError('Select both project and resource.');
            return;
        }

        const newKey = rowKey(emp.id, project.id);
        if (grid.plannerRows.some((r) => r.rowKey === newKey)) {
            setDraftError('This resource is already allocated to that project.');
            return;
        }

        grid.appendPlannerRow({
            rowKey: newKey,
            employeeId: emp.id,
            employeeName: emp.name,
            projectId: project.id,
            projectName: project.name,
            projectCode: project.code,
            weekCells: {},
        });
        handleCancelDraft();
    }, [draftProjectId, draftEmployeeId, projectOptions, employeeOptions, grid, handleCancelDraft]);

    const handleSave = async () => {
        await grid.saveBulk();
    };

    return (
        <PageContainer className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Resource Allocation</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Allocate resources to projects based on skills, availability, and experience.
                    {isAdminReadOnly && (
                        <span className="ml-2 text-brand-600 font-medium">
                            {isReadOnlyExecutive ? 'Executive view — read only' : 'Admin view — read only'}
                        </span>
                    )}
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
                            {new Set(filteredRows.map((r) => r.projectId).filter(Boolean)).size}{' '}
                            project
                            {new Set(filteredRows.map((r) => r.projectId).filter(Boolean)).size === 1
                                ? ''
                                : 's'}
                            {' · '}
                            {filteredRows.filter((r) => r.employeeId).length} resource
                            {filteredRows.filter((r) => r.employeeId).length === 1 ? '' : 's'}
                            {planningWeeks.length > 0 &&
                                ` · ${format(parseISO(planningWeeks[0]), 'd MMM yyyy')} – ${format(parseISO(planningWeeks[planningWeeks.length - 1]), 'd MMM yyyy')}`}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {planningWeeks.length > WEEKS_VISIBLE && (
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
                                    {Math.min(weekWindowStart + WEEKS_VISIBLE, planningWeeks.length)} of{' '}
                                    {planningWeeks.length}
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
                                                planningWeeks.length - WEEKS_VISIBLE
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
                        {grid.saveMessage} Changes sync to Weekly Planner automatically.
                    </p>
                )}

                <PlannerGridSearchBar
                    projectSearch={searchProject}
                    resourceSearch={searchResource}
                    onProjectSearchChange={setSearchProject}
                    onResourceSearchChange={setSearchResource}
                />

                {canEditGrid && (
                    <AllocationDraftRow
                        open={showDraftForm}
                        projects={projectOptions}
                        employees={employeeOptions}
                        projectId={draftProjectId}
                        employeeId={draftEmployeeId}
                        error={draftError}
                        saving={false}
                        onProjectChange={setDraftProjectId}
                        onEmployeeChange={setDraftEmployeeId}
                        onSave={handleSaveDraftRow}
                        onCancel={handleCancelDraft}
                    />
                )}

                <AllocationWeeklyGrid
                    rows={filteredRows}
                    weeks={visibleWeeks.length > 0 ? visibleWeeks : planningWeeks}
                    employees={employeeOptions}
                    projects={projectOptions}
                    canEdit={canEditGrid}
                    editableProjectIds={editableProjectIds}
                    dirtyKeys={grid.dirtyKeys}
                    onPlannedHoursChange={grid.updatePlannedHours}
                    onEmployeeChange={handleEmployeeChange}
                    onProjectChange={handleProjectChange}
                    loading={grid.loading || projLoading}
                />

                <AllocationGridLegend />
            </div>
        </PageContainer>
    );
}
