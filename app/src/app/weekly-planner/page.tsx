import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfWeek, addWeeks } from 'date-fns';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/lib/use-employees';
import { useProjects } from '@/lib/use-projects';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import { buildCapacitySummariesFromRows, filterPlannerRowsByUtilization } from '@/lib/weekly-grid-pivot';
import type { WeeklyGridFilters } from '@/types/weekly-allocation';
import type { WeeklyPlannerGridRow } from '@/types/weekly-allocation';
import { WeeklyPlannerFilters } from './components/weekly-planner-filters';
import { WeeklyPlannerGrid } from './components/weekly-planner-grid';
import { CapacitySummaryPanel } from './components/capacity-summary-panel';
import { RoleGuard } from '@/components/shared/role-guard';
import './weekly-planner-grid.css';
import {
    Save,
    Undo2,
    Loader2,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { useUtilizationDashboardSummary } from '@/lib/use-utilization';

function defaultFilterDraft(): WeeklyGridFilters {
    const from = startOfWeek(new Date(), { weekStartsOn: 1 });
    const to = addWeeks(from, 11);
    return {
        weekStartFrom: format(from, 'yyyy-MM-dd'),
        weekStartTo: format(to, 'yyyy-MM-dd'),
        utilization: 'all',
    };
}

export default function WeeklyPlannerPage() {
    const { user } = useAuth();
    const canEdit = user?.role === 'Admin';
    const readOnly = user?.role === 'Project Manager';

    const { employees } = useEmployees();
    const { projects } = useProjects();

    const [filterDraft, setFilterDraft] = useState<WeeklyGridFilters>(defaultFilterDraft);
    const [selectedRow, setSelectedRow] = useState<WeeklyPlannerGridRow | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<string | undefined>();

    const grid = useWeeklyAllocationGrid({ canEdit, pageSize: 500 });
    const utilization = useUtilizationDashboardSummary();
    const [syncingActuals, setSyncingActuals] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const visibleRows = useMemo(
        () =>
            filterPlannerRowsByUtilization(
                grid.plannerRows,
                grid.weeks,
                filterDraft.utilization
            ),
        [grid.plannerRows, grid.weeks, filterDraft.utilization]
    );
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

    const resetFilters = () => {
        const d = defaultFilterDraft();
        setFilterDraft(d);
        void grid.fetchGrid(d, 1);
    };

    const handleSave = async () => {
        await grid.saveBulk();
    };

    const handleSyncActuals = async () => {
        setSyncingActuals(true);
        setSyncMessage(null);
        try {
            const result = await utilization.syncActuals({
                weekStartFrom: filterDraft.weekStartFrom,
                weekStartTo: filterDraft.weekStartTo,
                employeeId: filterDraft.employeeId,
                projectId: filterDraft.projectId,
            });
            setSyncMessage(
                `Synced actuals: ${result.cellsUpdated} updated, ${result.cellsCreated} created.`
            );
            await grid.fetchGrid(filterDraft, grid.pagination.page);
        } catch (err) {
            setSyncMessage(err instanceof Error ? err.message : 'Actuals sync failed');
        } finally {
            setSyncingActuals(false);
        }
    };

    return (
        <PageContainer className="max-w-[100%] space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <CalendarRange className="w-6 h-6 text-brand-600" />
                        <h1 className="text-2xl font-semibold text-gray-900">Weekly Resource Planner</h1>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        Plan hours by resource and project across weeks. Legacy allocations are merged when enabled on the server.
                    </p>
                    <div className="flex gap-2 mt-2">
                        {canEdit && (
                            <Badge variant="success">Admin — editable</Badge>
                        )}
                        {readOnly && (
                            <Badge variant="info">Project Manager — read only</Badge>
                        )}
                        {grid.hasDirty && (
                            <Badge variant="warning">{grid.dirtyCount} unsaved change(s)</Badge>
                        )}
                    </div>
                </div>
                <RoleGuard allowedRoles={['Admin']}>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSyncActuals}
                            disabled={syncingActuals || grid.loading}
                            title="Reconcile approved time entries into weekly actual hours"
                        >
                            {syncingActuals ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Sync actuals
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => grid.discardChanges()}
                            disabled={!grid.hasDirty || grid.saving}
                        >
                            <Undo2 className="w-4 h-4 mr-2" />
                            Discard
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!grid.hasDirty || grid.saving}
                            className="bg-brand-500 hover:bg-brand-600"
                        >
                            {grid.saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save changes
                        </Button>
                    </div>
                </RoleGuard>
            </div>

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
                <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
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

            {grid.saveMessage && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    {grid.saveMessage}
                </p>
            )}

            {syncMessage && (
                <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    {syncMessage}
                </p>
            )}

            <div className="flex flex-col gap-6">
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

                <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                            {visibleRows.length} row(s) · {grid.weeks.length} week(s)
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

                    <WeeklyPlannerGrid
                        rows={visibleRows}
                        weeks={grid.weeks}
                        canEdit={canEdit}
                        dirtyKeys={grid.dirtyKeys}
                        onPlannedHoursChange={grid.updatePlannedHours}
                        onSelectionChange={(row) => {
                            setSelectedRow(row);
                        }}
                        loading={grid.loading}
                    />

                    <p className="text-xs text-gray-500">
                        <span className="inline-block w-3 h-3 bg-amber-100 border border-amber-400 rounded mr-1 align-middle" />
                        Unsaved plan ·
                        <span className="inline-block w-3 h-3 bg-slate-100 border border-slate-300 rounded mx-1 align-middle" />
                        Actual (read-only) ·
                        <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded mx-1 align-middle" />
                        Δ overrun ·
                        <span className="inline-block w-3 h-3 bg-amber-50 border border-amber-300 rounded mx-1 align-middle" />
                        Δ under plan ·
                        <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded mx-1 align-middle" />
                        Over-allocated week
                    </p>
                </div>
            </div>
        </PageContainer>
    );
}
