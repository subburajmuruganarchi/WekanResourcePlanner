import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Save, Undo2, AlertCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/lib/use-projects';
import { useAuth } from '@/lib/auth-context';
import { canEditPlannedAllocations, canEditActualAllocations, canAssignProjectStaff, isAllocationViewerReadOnly, ROLES, isEmployeeAccessRole } from '@/lib/roles';
import { getMvpFeatures } from '@/lib/mvp-config';
import { normalizeRoleName } from '@/lib/role-utils';
import { usePortfolioScope } from '@/lib/use-portfolio-scope';
import { useEmployees } from '@/lib/use-employees';
import { isActiveRosterMember } from '@/lib/employee-status';
import { filterProjectsManagedByEmployee } from '@/lib/project-scope';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyPlannerFilters } from '@/app/weekly-planner/components/weekly-planner-filters';
import { WeeklyPlannerGrid } from '@/app/weekly-planner/components/weekly-planner-grid';
import { CapacitySummaryPanel } from '@/app/weekly-planner/components/capacity-summary-panel';
import { buildCapacitySummariesFromRows } from '@/lib/weekly-grid-pivot';
import { startOfWeek, addWeeks, format as formatDate } from 'date-fns';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';

const BENCH_PROJECT_CODE = 'BENCH';

function defaultPlannerFilters(): WeeklyGridFilters {
    const from = startOfWeek(new Date(), { weekStartsOn: 1 });
    const to = addWeeks(from, 11);
    return {
        weekStartFrom: formatDate(from, 'yyyy-MM-dd'),
        weekStartTo: formatDate(to, 'yyyy-MM-dd'),
        utilization: 'all',
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
    const isViewerReadOnly = isAllocationViewerReadOnly(user?.role);
    const isAdmin = normalizeRoleName(user?.role) === ROLES.ADMIN;
    const isCEO = normalizeRoleName(user?.role) === ROLES.CEO;
    const isPM = normalizeRoleName(user?.role) === ROLES.PROJECT_MANAGER;
    const isDM = normalizeRoleName(user?.role) === ROLES.DELIVERY_MANAGER;
    const canEditPlanned = canEditPlannedAllocations(user?.role);
    const canEditActual = canEditActualAllocations(user?.role);
    const isEmployeeUser = isEmployeeAccessRole(user?.role);
    const canAssignStaff = canAssignProjectStaff(user?.role) && !isViewerReadOnly;
    const mvpMode = getMvpFeatures().mvpMode;
    const { editableProjectIds: dmPortfolioIds } = usePortfolioScope(user?.role);

    const { projects, loading: projLoading } = useProjects();
    const { employees } = useEmployees();
    const managedProjectIds = useMemo(() => {
        if (!user?.id || !isPM) return undefined;
        return new Set(filterProjectsManagedByEmployee(projects, user.id).map((p) => p.id));
    }, [projects, user?.id, isPM]);

    const editableProjectIds = useMemo(() => {
        if (mvpMode && isDM) return undefined;
        if (mvpMode && isPM && managedProjectIds) return managedProjectIds;
        if (!mvpMode && dmPortfolioIds) return dmPortfolioIds;
        return undefined;
    }, [mvpMode, isDM, isPM, managedProjectIds, dmPortfolioIds]);

    const [screenTab, setScreenTab] = useState<'matrix' | 'capacity'>('matrix');
    const [plannerFilters, setPlannerFilters] = useState<WeeklyGridFilters>(defaultPlannerFilters);
    const [gridEditField, setGridEditField] = useState<'planned' | 'actual'>('planned');
    const canEditCurrentField =
        gridEditField === 'actual' ? canEditActual : canEditPlanned;

    const [weekWindowStart, setWeekWindowStart] = useState(0);
    const [searchProject, setSearchProject] = useState('');
    const [searchResource, setSearchResource] = useState('');
    const [showDraftForm, setShowDraftForm] = useState(false);
    const [draftProjectId, setDraftProjectId] = useState('');
    const [draftEmployeeId, setDraftEmployeeId] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const WEEKS_VISIBLE = 8;

    const grid = useWeeklyAllocationGrid({
        canEdit: canEditCurrentField,
        pageSize: 500,
        fetchAllPages: true,
        allowOverAllocation: true,
        includeUnstaffedProjects: true,
    });

    const projectOptions = useMemo(
        () => {
            let list = projects;
            if (isPM && managedProjectIds) {
                list = projects.filter((p) => managedProjectIds.has(p.id));
            }
            if (isEmployeeUser && user?.id) {
                list = list.filter((p) =>
                    p.teamMembers?.some((m) => m.employeeId === user.id)
                );
            }
            return list
                .map((p) => ({ id: p.id, name: p.name, code: p.code }))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        [projects, isPM, managedProjectIds, isEmployeeUser, user?.id]
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
            .filter((e) => isActiveRosterMember(e))
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

    const employeeAssignedProjectIds = useMemo(() => {
        if (!isEmployeeUser || !user?.id) return null;
        return new Set(
            projects
                .filter((p) => p.teamMembers?.some((m) => m.employeeId === user.id))
                .map((p) => p.id)
        );
    }, [projects, isEmployeeUser, user?.id]);

    const displayRows = useMemo((): AllocationGridRow[] => {
        let rows = grid.plannerRows
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

        if (isEmployeeUser && user?.id && employeeAssignedProjectIds) {
            rows = rows.filter(
                (row) =>
                    row.employeeId === user.id &&
                    employeeAssignedProjectIds.has(row.projectId)
            );
        }

        return rows;
    }, [grid.plannerRows, employeeRoleMap, projectTypeById, isEmployeeUser, user?.id, employeeAssignedProjectIds]);

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

        if (isPM && managedProjectIds && !managedProjectIds.has(draftProjectId)) {
            setDraftError('You can only add resources to projects you manage.');
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
    }, [draftProjectId, draftEmployeeId, projectOptions, employeeOptions, grid, handleCancelDraft, isPM, managedProjectIds]);

    const handleSave = async () => {
        await grid.saveBulk();
    };

    return (
        <PageContainer className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Resource Planning</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {isCEO ? (
                        <>
                            Each week shows <strong className="text-foreground">Plan</strong>,{' '}
                            <strong className="text-foreground">Act</strong> (approved time), and{' '}
                            <strong className="text-foreground">Δ</strong> (actual minus plan). Read-only executive view.
                        </>
                    ) : (
                        <>Plan resources and track planned vs actual hours.</>
                    )}
                    {isViewerReadOnly && !isCEO && (
                        <span className="ml-2 text-brand-600 dark:text-brand-400 font-medium">
                            Read-only view — actuals are entered by Project Managers and Delivery Managers.
                        </span>
                    )}
                    {isPM && mvpMode && !isViewerReadOnly && (
                        <span className="ml-2 text-muted-foreground">
                            You can view all projects; edit planned/actual hours only on projects you manage.
                        </span>
                    )}
                </p>
            </div>

            {isAdmin && (
                <Tabs value={screenTab} onValueChange={(v) => setScreenTab(v as 'matrix' | 'capacity')}>
                    <TabsList>
                        <TabsTrigger value="matrix">Allocation matrix</TabsTrigger>
                        <TabsTrigger value="capacity">Capacity & utilization</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            {isCEO && (
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                            {new Set(filteredRows.map((r) => r.projectId).filter(Boolean)).size} projects ·{' '}
                            {filteredRows.filter((r) => r.employeeId).length} resources
                            {planningWeeks.length > 0 &&
                                ` · ${format(parseISO(planningWeeks[0]), 'd MMM yyyy')} – ${format(parseISO(planningWeeks[planningWeeks.length - 1]), 'd MMM yyyy')}`}
                        </span>
                        {planningWeeks.length > WEEKS_VISIBLE && (
                            <div className="flex items-center gap-2">
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
                                <span className="text-xs text-muted-foreground">
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
                                            Math.min(s + WEEKS_VISIBLE, planningWeeks.length - WEEKS_VISIBLE)
                                        )
                                    }
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {grid.error && (
                        <div className="flex items-start gap-2 text-critical bg-critical-bg border border-critical-border rounded-lg px-4 py-3 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p>{grid.error}</p>
                        </div>
                    )}

                    <PlannerGridSearchBar
                        projectSearch={searchProject}
                        resourceSearch={searchResource}
                        onProjectSearchChange={setSearchProject}
                        onResourceSearchChange={setSearchResource}
                    />

                    <WeeklyPlannerGrid
                        rows={filteredRows}
                        weeks={visibleWeeks.length > 0 ? visibleWeeks : planningWeeks}
                        canEdit={false}
                        dirtyKeys={grid.dirtyKeys}
                        onPlannedHoursChange={grid.updatePlannedHours}
                        loading={grid.loading || projLoading}
                    />

                    <p className="text-xs text-muted-foreground">
                        <strong>Plan</strong> = weekly planned hours · <strong>Act</strong> = approved time entries ·{' '}
                        <strong>Δ</strong> = actual − plan (positive = overrun on that project)
                    </p>
                </div>
            )}

            {!isCEO && (screenTab === 'matrix' || !isAdmin) && (
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {canAssignStaff && (
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
                        <span className="text-sm text-muted-foreground">
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

                        {(canEditPlanned || canEditActual) && mvpMode && (
                            <div className="flex rounded-md border border-border overflow-hidden text-xs">
                                {canEditPlanned && (
                                <button
                                    type="button"
                                    className={`px-3 py-1.5 ${gridEditField === 'planned' ? 'bg-brand-500 text-white' : 'bg-card text-foreground'}`}
                                    onClick={() => setGridEditField('planned')}
                                >
                                    Planned hours
                                </button>
                                )}
                                {canEditActual && (
                                <button
                                    type="button"
                                    className={`px-3 py-1.5 ${gridEditField === 'actual' ? 'bg-brand-500 text-white' : 'bg-card text-foreground'}`}
                                    onClick={() => setGridEditField('actual')}
                                >
                                    Actual hours
                                </button>
                                )}
                            </div>
                        )}

                        {canEditCurrentField && (
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
                    <div className="flex items-start gap-2 text-critical bg-critical-bg border border-critical-border rounded-lg px-4 py-3 text-sm">
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
                    <p className="text-sm text-success bg-success-bg border border-success-border rounded-lg px-4 py-2">
                        {grid.saveMessage} Changes sync to Weekly Planner automatically.
                    </p>
                )}

                <PlannerGridSearchBar
                    projectSearch={searchProject}
                    resourceSearch={searchResource}
                    onProjectSearchChange={setSearchProject}
                    onResourceSearchChange={setSearchResource}
                />

                {canEditCurrentField && (
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
                    canEdit={canEditCurrentField}
                    editableProjectIds={editableProjectIds}
                    cellEditField={gridEditField}
                    dirtyKeys={grid.dirtyKeys}
                    onPlannedHoursChange={grid.updatePlannedHours}
                    onActualHoursChange={grid.updateActualHours}
                    onEmployeeChange={handleEmployeeChange}
                    onProjectChange={handleProjectChange}
                    loading={grid.loading || projLoading}
                />

                <AllocationGridLegend />
            </div>
            )}

            {!isCEO && isAdmin && screenTab === 'capacity' && (
                <div className="space-y-4">
                    <WeeklyPlannerFilters
                        draft={plannerFilters}
                        onChange={setPlannerFilters}
                        onApply={() => void grid.fetchGrid(plannerFilters, 1)}
                        onReset={() => {
                            const d = defaultPlannerFilters();
                            setPlannerFilters(d);
                            void grid.fetchGrid(d, 1);
                        }}
                        employees={employees}
                        projects={projects}
                        loading={grid.loading}
                    />
                    <CapacitySummaryPanel
                        summaries={
                            grid.capacitySummary.length > 0
                                ? grid.capacitySummary
                                : buildCapacitySummariesFromRows(grid.plannerRows, grid.weeks)
                        }
                        employees={employees}
                        weeks={grid.weeks}
                        loading={grid.loading}
                    />
                    <WeeklyPlannerGrid
                        rows={grid.plannerRows}
                        weeks={grid.weeks}
                        canEdit={false}
                        dirtyKeys={grid.dirtyKeys}
                        onPlannedHoursChange={grid.updatePlannedHours}
                        loading={grid.loading}
                    />
                </div>
            )}
        </PageContainer>
    );
}
