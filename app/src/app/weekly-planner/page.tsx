import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfWeek, addWeeks } from 'date-fns';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import {
    canEditPlannedAllocations,
    isDeliveryManager,
    isEmployeeAccessRole,
    isExecutiveReadOnly,
    ROLES,
} from '@/lib/roles';
import { normalizeRoleName } from '@/lib/role-utils';
import { getMvpFeatures } from '@/lib/mvp-config';
import { usePortfolioScope } from '@/lib/use-portfolio-scope';
import { useEmployees } from '@/lib/use-employees';
import { useProjects } from '@/lib/use-projects';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import { buildCapacitySummariesFromRows, filterPlannerRowsByUtilization } from '@/lib/weekly-grid-pivot';
import { matchesPlannerGridSearch } from '@/lib/planner-grid-search';
import { subscribeWeeklyGridUpdated } from '@/lib/weekly-grid-sync';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';
import type { WeeklyPlannerGridRow } from '@/types/weekly-allocation';
import { WeeklyPlannerFilters } from './components/weekly-planner-filters';
import { WeeklyPlannerGrid } from './components/weekly-planner-grid';
import { PlannerGridSearchBar } from '@/components/weekly-planner/planner-grid-search-bar';
import { projectTypeLabel } from '@/lib/project-type-label';
import { CapacitySummaryPanel } from './components/capacity-summary-panel';
import './weekly-planner-grid.css';
import { CalendarRange, AlertCircle, ChevronLeft, ChevronRight, Loader2, Save, Undo2 } from 'lucide-react';

function defaultFilterDraft(): WeeklyGridFilters {
    const from = startOfWeek(new Date(), { weekStartsOn: 1 });
    const to = addWeeks(from, 11);
    return {
        weekStartFrom: format(from, 'yyyy-MM-dd'),
        weekStartTo: format(to, 'yyyy-MM-dd'),
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

export default function WeeklyPlannerPage() {
    const { user } = useAuth();
    const isReadOnlyExecutive = isExecutiveReadOnly(user?.role);
    const isDM = isDeliveryManager(user?.role);
    const isPM = normalizeRoleName(user?.role) === ROLES.PROJECT_MANAGER;
    const isEmployeeUser = isEmployeeAccessRole(user?.role);
    const mvpMode = getMvpFeatures().mvpMode;
    // PM + Employee: view-only weekly planner (same UI as Admin/DM, no edits).
    const canEdit =
        canEditPlannedAllocations(user?.role) &&
        !isReadOnlyExecutive &&
        !isPM &&
        !isEmployeeUser;
    const { editableProjectIds: portfolioScopeIds } = usePortfolioScope(user?.role);
    const editableProjectIds = mvpMode && isDM ? undefined : portfolioScopeIds;

    const { employees } = useEmployees();
    const { projects } = useProjects();

    const [filterDraft, setFilterDraft] = useState<WeeklyGridFilters>(defaultFilterDraft);
    const [selectedRow, setSelectedRow] = useState<WeeklyPlannerGridRow | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<string | undefined>();
    const [searchProject, setSearchProject] = useState('');
    const [searchResource, setSearchResource] = useState('');
    const [searchRole, setSearchRole] = useState('');

    const grid = useWeeklyAllocationGrid({
        canEdit,
        pageSize: 500,
        includeUnstaffedProjects: true,
    });

    const visibleRows = useMemo(
        () =>
            filterPlannerRowsByUtilization(
                grid.plannerRows,
                grid.weeks,
                filterDraft.utilization
            ),
        [grid.plannerRows, grid.weeks, filterDraft.utilization]
    );

    const employeeRoleMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const emp of employees) {
            map.set(emp.id, employeeRoleLabel(emp));
        }
        return map;
    }, [employees]);

    const projectTypeById = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of projects) {
            map.set(p.id, projectTypeLabel(p.type, p.billingType));
        }
        return map;
    }, [projects]);

    const gridDisplayRows = useMemo(() => {
        return visibleRows
            .map((row) => ({
                ...row,
                projectType:
                    row.projectType ||
                    projectTypeById.get(row.projectId) ||
                    '—',
                employeeRole: row.employeeId ? employeeRoleMap.get(row.employeeId) || '—' : '—',
                employeeName: row.employeeId
                    ? row.employeeName
                    : row.rowKey.startsWith('placeholder:')
                      ? 'Unassigned'
                      : row.employeeName,
            }))
            .filter((row) => {
                if (isEmployeeUser && user?.id && row.employeeId !== user.id) return false;
                return matchesPlannerGridSearch(row, {
                    project: searchProject,
                    resource: searchResource,
                    role: searchRole,
                });
            })
            .sort((a, b) => {
                const byProject = a.projectName.localeCompare(b.projectName, undefined, {
                    sensitivity: 'base',
                });
                if (byProject !== 0) return byProject;
                return a.employeeName.localeCompare(b.employeeName, undefined, {
                    sensitivity: 'base',
                });
            });
    }, [
        visibleRows,
        employeeRoleMap,
        projectTypeById,
        searchProject,
        searchResource,
        searchRole,
        isEmployeeUser,
        user?.id,
    ]);
    const effectiveCapacity = useMemo(() => {
        if (grid.capacitySummary.length > 0) return grid.capacitySummary;
        if (grid.weeks.length === 0) return [];
        return buildCapacitySummariesFromRows(grid.plannerRows, grid.weeks);
    }, [grid.capacitySummary, grid.plannerRows, grid.weeks]);

    const applyFilters = useCallback(() => {
        void grid.fetchGrid(filterDraft, 1);
    }, [grid, filterDraft]);

    useEffect(() => {
        void grid.fetchGrid(filterDraft, 1);
        // Initial load only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return subscribeWeeklyGridUpdated(() => {
            void grid.fetchGrid(filterDraft, grid.pagination.page);
        });
    }, [filterDraft, grid]);

    const resetFilters = () => {
        const d = defaultFilterDraft();
        setFilterDraft(d);
        void grid.fetchGrid(d, 1);
    };

    return (
        <PageContainer className="max-w-[100%] space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <CalendarRange className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        <h1 className="text-2xl font-semibold text-foreground">Weekly Planner</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {canEdit ? (
                            <>
                                Each week shows <strong className="text-foreground">Plan</strong> (editable weekly hours),{' '}
                                <strong className="text-foreground">Act</strong> (approved time entries), and{' '}
                                <strong className="text-foreground">Δ</strong> (actual minus plan — positive means overrun on that project).
                            </>
                        ) : (
                            <>
                                View-only planner — each week shows <strong className="text-foreground">Plan</strong>,{' '}
                                <strong className="text-foreground">Act</strong> (approved time), and{' '}
                                <strong className="text-foreground">Δ</strong> (actual minus plan).
                                {isEmployeeUser ? ' Showing your assigned projects only.' : ''}
                            </>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {!canEdit && <Badge variant="info">Read-only</Badge>}
                        {canEdit && isDM && <Badge variant="secondary">Edit Plan cells · save below</Badge>}
                    </div>
                </div>
                {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
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
                            onClick={() => void grid.saveBulk()}
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

            {grid.saveMessage && (
                <p className="text-sm text-success bg-success-bg border border-success-border rounded-lg px-4 py-2">
                    {grid.saveMessage}
                </p>
            )}

            <WeeklyPlannerFilters
                draft={filterDraft}
                onChange={setFilterDraft}
                onApply={applyFilters}
                onReset={resetFilters}
                employees={employees}
                projects={projects}
                loading={grid.loading}
            />

            {grid.error && (
                <div className="flex items-start gap-2 text-critical bg-critical-bg border border-critical-border rounded-lg px-4 py-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Weekly planner error</p>
                        <p>{grid.error}</p>
                        {grid.error.includes('disabled') && (
                            <p className="mt-1 text-xs">
                                Enable <code className="bg-red-100 px-1 rounded">FEATURE_WEEKLY_ALLOCATIONS_ENABLED=true</code> on the backend and restart.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6">
                {!isEmployeeUser && (
                    <CapacitySummaryPanel
                        summaries={effectiveCapacity}
                        employees={employees}
                        weeks={grid.weeks}
                        selectedEmployeeId={selectedRow?.employeeId ?? filterDraft.employeeId}
                        selectedEmployeeName={selectedRow?.employeeName}
                        selectedWeekStart={selectedWeek}
                        onWeekChange={setSelectedWeek}
                        loading={grid.loading}
                    />
                )}

                <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            {gridDisplayRows.length} row(s) · {grid.weeks.length} week(s)
                            {grid.pagination.totalPages > 1 &&
                                ` · page ${grid.pagination.page} / ${grid.pagination.totalPages}`}
                        </span>
                        {grid.pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={grid.pagination.page <= 1 || grid.loading}
                                    onClick={() => grid.setPage(grid.pagination.page - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        grid.pagination.page >= grid.pagination.totalPages ||
                                        grid.loading
                                    }
                                    onClick={() => grid.setPage(grid.pagination.page + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <PlannerGridSearchBar
                        projectSearch={searchProject}
                        resourceSearch={searchResource}
                        roleSearch={searchRole}
                        onProjectSearchChange={setSearchProject}
                        onResourceSearchChange={setSearchResource}
                        onRoleSearchChange={setSearchRole}
                        showRole
                    />

                    <WeeklyPlannerGrid
                        rows={gridDisplayRows}
                        weeks={grid.weeks}
                        canEdit={canEdit}
                        editableProjectIds={editableProjectIds}
                        dirtyKeys={grid.dirtyKeys}
                        onPlannedHoursChange={grid.updatePlannedHours}
                        onSelectionChange={(row) => {
                            setSelectedRow(row);
                        }}
                        loading={grid.loading}
                    />

                    <p className="text-xs text-muted-foreground">
                        <span className="inline-block w-3 h-3 bg-warning-bg border border-warning-border rounded mr-1 align-middle" />
                        Unsaved plan ·
                        <span className="inline-block w-3 h-3 bg-muted border border-border rounded mx-1 align-middle" />
                        Actual (read-only) ·
                        <span className="inline-block w-3 h-3 bg-critical-bg border border-critical-border rounded mx-1 align-middle" />
                        Δ overrun ·
                        <span className="inline-block w-3 h-3 bg-warning-bg border border-warning-border rounded mx-1 align-middle" />
                        Δ under plan
                    </p>
                </div>
            </div>
        </PageContainer>
    );
}
