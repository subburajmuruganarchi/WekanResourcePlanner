import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/page-container';
import { useProjects } from '@/lib/use-projects';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/lib/use-employees';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import { rowKey } from '@/lib/weekly-grid-pivot';
import { matchesPlannerGridSearch } from '@/lib/planner-grid-search';
import { subscribeWeeklyGridUpdated } from '@/lib/weekly-grid-sync';
import { buildPlanningWeekRange, filterWeeksFromCurrent } from '@/lib/planning-week-utils';
import { projectTypeLabel } from '@/lib/project-type-label';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';
import {
    type AllocationGridRow,
    type EmployeeOption,
} from './components/allocation-weekly-grid';
import { AllocationDraftRow } from './components/allocation-draft-row';
import { AllocationHeader } from './components/resource-allocation/AllocationHeader';
import { CapacityCards } from './components/resource-allocation/CapacityCards';
import { ViewSwitcher } from './components/resource-allocation/ViewSwitcher';
import { TimelinePlanner } from './components/resource-allocation/TimelinePlanner';
import { ResourceGrid } from './components/resource-allocation/ResourceGrid';
import { HeatmapView } from './components/resource-allocation/HeatmapView';
import { CapacityView } from './components/resource-allocation/CapacityView';
import {
    FilterPanel,
    applyWorkspaceFilters,
} from './components/resource-allocation/FilterPanel';
import { AIInsightPanel } from './components/resource-allocation/AIInsightPanel';
import { CapacityStatusBar } from './components/resource-allocation/CapacityStatusBar';
import { SaveConfirmDialog } from './components/resource-allocation/SaveConfirmDialog';
import {
    computeAllocationMetrics,
    deriveAIInsights,
    exportRowsToCsv,
} from './components/resource-allocation/allocation-metrics';
import {
    DEFAULT_WORKSPACE_FILTERS,
    type AllocationViewMode,
    type AllocationWorkspaceFilters,
} from './components/resource-allocation/types';
import './resource-allocation.css';

const BENCH_PROJECT_CODE = 'BENCH';
const WEEKS_VISIBLE = 8;

function employeeRoleLabel(emp: {
    jobRole?: string;
    position?: string;
    role?: string;
}): string {
    return emp.jobRole || emp.position || (typeof emp.role === 'string' ? emp.role : '') || '—';
}

export function Allocation() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canEditGrid = user?.role === 'Admin';

    const { projects, loading: projLoading } = useProjects();
    const { employees } = useEmployees();

    const [viewMode, setViewMode] = useState<AllocationViewMode>('timeline');
    const [weekWindowStart, setWeekWindowStart] = useState(0);
    const [searchProject, setSearchProject] = useState('');
    const [searchResource, setSearchResource] = useState('');
    const [workspaceFilters, setWorkspaceFilters] =
        useState<AllocationWorkspaceFilters>(DEFAULT_WORKSPACE_FILTERS);
    const [showDraftForm, setShowDraftForm] = useState(false);
    const [draftProjectId, setDraftProjectId] = useState('');
    const [draftEmployeeId, setDraftEmployeeId] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

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
                    row.projectType || projectTypeById.get(row.projectId) || '—',
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

    const weeksForView = visibleWeeks.length > 0 ? visibleWeeks : planningWeeks;

    const filteredRows = useMemo(() => {
        const searched = displayRows.filter((row) =>
            matchesPlannerGridSearch(row, {
                project: searchProject,
                resource: searchResource,
            })
        );
        return applyWorkspaceFilters(searched, workspaceFilters, weeksForView, employees);
    }, [displayRows, searchProject, searchResource, workspaceFilters, weeksForView, employees]);

    const metrics = useMemo(
        () =>
            computeAllocationMetrics(filteredRows, weeksForView, grid.capacitySummary),
        [filteredRows, weeksForView, grid.capacitySummary]
    );

    const aiInsights = useMemo(
        () => deriveAIInsights(filteredRows, weeksForView, grid.capacitySummary, employeeRoleMap),
        [filteredRows, weeksForView, grid.capacitySummary, employeeRoleMap]
    );

    const handleEmployeeChange = useCallback(
        (row: AllocationGridRow, employeeId: string) => {
            const emp = employeeOptions.find((e) => e.id === employeeId);
            if (!emp) return;

            const newKey = rowKey(employeeId, row.projectId);
            if (grid.plannerRows.some((r) => r.rowKey === newKey && r.rowKey !== row.rowKey)) {
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
                if (grid.plannerRows.some((r) => r.rowKey === newKey && r.rowKey !== row.rowKey)) {
                    return;
                }
            }

            grid.changeRowProject(row.rowKey, project.id, project.name, project.code);
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

    const handleConfirmSave = async () => {
        await grid.saveBulk();
        setSaveDialogOpen(false);
    };

    const handleAiReview = useCallback(
        (insight: { type: string }) => {
            if (insight.type === 'risk') {
                setWorkspaceFilters((f) => ({ ...f, availability: 'overloaded', utilizationMin: 85 }));
                setViewMode('capacity');
            } else if (insight.type === 'skill-gap') {
                setViewMode('grid');
            } else {
                setViewMode('timeline');
            }
        },
        []
    );

    const weekNavLabel =
        planningWeeks.length > WEEKS_VISIBLE
            ? `Weeks ${weekWindowStart + 1}–${Math.min(weekWindowStart + WEEKS_VISIBLE, planningWeeks.length)} of ${planningWeeks.length}`
            : planningWeeks.length > 0
              ? `${format(parseISO(planningWeeks[0]), 'd MMM')} – ${format(parseISO(planningWeeks[planningWeeks.length - 1]), 'd MMM yyyy')}`
              : '';

    const loading = grid.loading || projLoading;

    return (
        <PageContainer className="space-y-5 max-w-[1800px]">
            <AllocationHeader
                canEdit={canEditGrid}
                dirtyCount={grid.dirtyCount}
                saving={grid.saving}
                onAddAllocation={handleAddRow}
                onImport={() => navigate('/inputs')}
                onExport={() => exportRowsToCsv(filteredRows, weeksForView)}
                onAiOptimize={() => setViewMode('heatmap')}
                onSave={() => setSaveDialogOpen(true)}
                onDiscard={() => grid.discardChanges()}
                addDisabled={projLoading || projects.length === 0}
                weekNav={
                    planningWeeks.length > 0
                        ? {
                              label: weekNavLabel,
                              canBack: canScrollWeeksBack,
                              canForward: canScrollWeeksForward,
                              onBack: () =>
                                  setWeekWindowStart((s) => Math.max(0, s - WEEKS_VISIBLE)),
                              onForward: () =>
                                  setWeekWindowStart((s) =>
                                      Math.min(
                                          s + WEEKS_VISIBLE,
                                          planningWeeks.length - WEEKS_VISIBLE
                                      )
                                  ),
                          }
                        : undefined
                }
            />

            <CapacityCards metrics={metrics} loading={loading} />

            {grid.error && (
                <div
                    className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"
                    role="alert"
                >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Could not load allocation workspace</p>
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
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                    {grid.saveMessage} Changes sync to Weekly Planner automatically.
                </p>
            )}

            <div className="flex flex-col xl:flex-row gap-5 items-start">
                <div className="flex-1 min-w-0 space-y-4 w-full">
                    <FilterPanel
                        filters={workspaceFilters}
                        onChange={setWorkspaceFilters}
                        projects={projectOptions}
                        employees={employees}
                        projectSearch={searchProject}
                        resourceSearch={searchResource}
                        onProjectSearchChange={setSearchProject}
                        onResourceSearchChange={setSearchResource}
                    />

                    <ViewSwitcher value={viewMode} onChange={setViewMode} />

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

                    {viewMode === 'timeline' && (
                        <TimelinePlanner rows={filteredRows} weeks={weeksForView} loading={loading} />
                    )}

                    {viewMode === 'grid' && (
                        <ResourceGrid
                            rows={filteredRows}
                            weeks={weeksForView}
                            employees={employeeOptions}
                            projects={projectOptions}
                            canEdit={canEditGrid}
                            dirtyKeys={grid.dirtyKeys}
                            onPlannedHoursChange={grid.updatePlannedHours}
                            onEmployeeChange={handleEmployeeChange}
                            onProjectChange={handleProjectChange}
                            loading={loading}
                        />
                    )}

                    {viewMode === 'heatmap' && (
                        <HeatmapView rows={filteredRows} weeks={weeksForView} loading={loading} />
                    )}

                    {viewMode === 'capacity' && (
                        <CapacityView
                            capacitySummary={grid.capacitySummary}
                            weeks={weeksForView}
                            loading={loading}
                        />
                    )}

                    <CapacityStatusBar />
                </div>

                <AIInsightPanel
                    insights={aiInsights}
                    onReview={handleAiReview}
                    onApply={() => setViewMode('timeline')}
                    collapsed={aiPanelCollapsed}
                    onToggle={() => setAiPanelCollapsed((c) => !c)}
                />
            </div>

            <SaveConfirmDialog
                open={saveDialogOpen}
                dirtyCount={grid.dirtyCount}
                saving={grid.saving}
                onConfirm={() => void handleConfirmSave()}
                onCancel={() => setSaveDialogOpen(false)}
            />
        </PageContainer>
    );
}
