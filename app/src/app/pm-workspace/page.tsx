import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderKanban,
    Users,
    Layers,
    Clock,
    Info,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    PageSkeleton,
    EnterpriseDataTable,
    StatusBadge,
} from '@/components/patterns';
import { TeamWorkloadChart, aggregateTeamWorkload } from '@/components/dashboard/TeamWorkloadChart';
import { PmDashboardCharts } from '@/app/pm-workspace/components/pm-dashboard-charts';
import { pmProjectDeliveryColumns } from '@/app/pm-workspace/components/pm-project-delivery-columns';
import { useProjects } from '@/lib/use-projects';
import { useEmployees } from '@/lib/use-employees';
import { useAuth } from '@/lib/auth-context';
import { buildPmDashboardSnapshot, buildPmProjectHoursRows, plannedHoursByProjectFromPlannerRows } from '@/lib/pm-dashboard-metrics';
import { buildPortfolioHealthRows } from '@/lib/portfolio-health-rows';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';
import { useUtilizationVariance } from '@/lib/use-utilization';
import { useWeeklyAllocationGrid } from '@/lib/use-weekly-allocation-grid';
import {
    buildDashboardPeriodRange,
    formatDashboardPeriodLabel,
    getCurrentWeekStart,
    getCurrentMonthValue,
} from '@/lib/dashboard-period';
import { projectStatusOf, projectStatusLabel } from '@/lib/project-status';
import { cn } from '@/lib/utils';

export default function PmDashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { projects, loading } = useProjects();
    const { employees, loading: teamLoading } = useEmployees({ allocatedToMyProjects: true, activeOnly: true });
    const { data: utilizationData, loading: utilLoading, fetchVariance } = useUtilizationVariance();
    const allocationGrid = useWeeklyAllocationGrid({
        canEdit: false,
        fetchAllPages: true,
        includeUnstaffedProjects: false,
    });
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);

    const weekStart = getCurrentWeekStart();
    const periodRange = useMemo(
        () => buildDashboardPeriodRange('week', weekStart, getCurrentMonthValue()),
        [weekStart]
    );
    const periodLabel = formatDashboardPeriodLabel('week', periodRange);

    const plannerPlannedByProject = useMemo(
        () => plannedHoursByProjectFromPlannerRows(allocationGrid.plannerRows, weekStart),
        [allocationGrid.plannerRows, weekStart]
    );

    const snapshot = useMemo(
        () =>
            buildPmDashboardSnapshot(
                projects,
                user?.id,
                employees.length,
                risks,
                utilizationData?.rows ?? [],
                plannerPlannedByProject
            ),
        [projects, user?.id, employees.length, risks, utilizationData?.rows, plannerPlannedByProject]
    );

    const projectHoursRows = useMemo(
        () =>
            buildPmProjectHoursRows(
                snapshot.myProjects,
                utilizationData?.rows ?? [],
                risks,
                plannerPlannedByProject
            ),
        [snapshot.myProjects, utilizationData?.rows, risks, plannerPlannedByProject]
    );

    const portfolioRows = useMemo(
        () => buildPortfolioHealthRows(snapshot.myProjects, risks, { activeOnly: false }),
        [snapshot.myProjects, risks]
    );

    const teamWorkload = useMemo(() => {
        const myProjectIds = new Set(snapshot.myProjects.map((p) => p.id));
        const scoped = (utilizationData?.rows ?? []).filter((r) => myProjectIds.has(r.projectId));
        return aggregateTeamWorkload(scoped);
    }, [utilizationData, snapshot.myProjects]);

    const deliveryColumns = useMemo(() => pmProjectDeliveryColumns(), []);

    useEffect(() => {
        void fetchVariance({
            weekStartFrom: periodRange.weekStartFrom,
            weekStartTo: periodRange.weekStartTo,
        });
        void allocationGrid.fetchGrid(
            {
                weekStartFrom: periodRange.weekStartFrom,
                weekStartTo: periodRange.weekStartTo,
                utilization: 'all',
                excludeBench: true,
            },
            1
        );
    }, [fetchVariance, periodRange.weekStartFrom, periodRange.weekStartTo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const myProjectIds = new Set(snapshot.myProjects.map((p) => p.id));
        fetchDeliveryRisks()
            .then((all) => {
                setRisks((all ?? []).filter((r) => myProjectIds.has(r.projectId)));
            })
            .catch(() => setRisks([]));
    }, [snapshot.myProjects]);

    if (loading) {
        return <PageSkeleton />;
    }

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Project Workspace"
                title="Project Dashboard"
                description="Delivery command center for projects you manage — portfolio health, team workload, and plan vs actual for this week."
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
                        All projects
                    </Button>
                }
            />

            {snapshot.allProjectsListSamePm && snapshot.orgActiveProjects > 3 && (
                <div
                    className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/30 p-4 text-sm"
                    role="status"
                >
                    <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                            All {snapshot.orgActiveProjects} active projects list you as project manager.
                        </p>
                        <p className="text-amber-800/90 dark:text-amber-200/80 mt-1">
                            If that is unexpected, assign the correct PM on each project in All Projects — future
                            sheet syncs will no longer overwrite PM assignments.
                        </p>
                    </div>
                </div>
            )}

            <MetricGrid columns={{ sm: 2, xl: 3 }}>
                <MetricCard
                    label="My projects"
                    value={String(snapshot.myProjectCount)}
                    icon={FolderKanban}
                    hint="Projects where you are PM or owner"
                    onClick={() => navigate('/projects')}
                />
                <MetricCard
                    label="Org active projects"
                    value={String(snapshot.orgActiveProjects)}
                    icon={Layers}
                    accent="sky"
                    hint="All active projects visible in the org (MVP)"
                />
                <MetricCard
                    label="Unique team members"
                    value={teamLoading ? '—' : String(snapshot.uniqueTeamMembers)}
                    icon={Users}
                    accent="sky"
                    hint={
                        snapshot.allocationSlots > snapshot.uniqueTeamMembers
                            ? `${snapshot.allocationSlots} allocation slots across projects (people counted once)`
                            : 'Distinct people allocated to your projects'
                    }
                />
                <MetricCard
                    label="Planned hours"
                    value={utilLoading ? '—' : `${Math.round(snapshot.plannedHoursWeek)}h`}
                    icon={Clock}
                    hint={periodLabel}
                />
            </MetricGrid>

            <Section
                title="Delivery visuals"
                description={`Status mix, portfolio hours, and per-project plan vs actual · ${periodLabel}`}
            >
                <PmDashboardCharts
                    statusBreakdown={snapshot.statusBreakdown}
                    projectHours={projectHoursRows}
                    plannedHoursWeek={snapshot.plannedHoursWeek}
                    actualHoursWeek={snapshot.actualHoursWeek}
                />
            </Section>

            <Section
                title="Team workload"
                description={`Unique team members on your projects — planned vs actual hours · ${periodLabel}`}
            >
                <TeamWorkloadChart rows={teamWorkload} loading={utilLoading} />
                {!utilLoading && teamWorkload.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-3">
                        Showing top {Math.min(10, teamWorkload.length)} people by planned hours. Actual above
                        planned highlights overruns (amber); under plan is shown in blue on the Δ column in the table
                        below.
                    </p>
                )}
            </Section>

            <Section
                title="Project delivery table"
                description="Sortable breakdown of your projects with team size, hours, and risk signals"
            >
                <EnterpriseDataTable
                    columns={deliveryColumns}
                    rows={projectHoursRows}
                    rowKey={(r) => r.projectId}
                    loading={utilLoading}
                    exportFilename="pm-project-delivery"
                    storageKey="r360-pm-project-delivery-cols"
                    onRowClick={(row) => navigate(`/projects/${row.projectId}`)}
                    emptyTitle="No assigned projects"
                    emptyDescription="Projects will appear here when you are set as project manager or owner."
                    mobileCardRender={(row) => (
                        <div>
                            <p className="font-medium text-card-foreground">{row.projectName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {row.status} · {row.teamSize} on team · {Math.round(row.plannedHours)}h planned
                            </p>
                            {row.riskLevel && (
                                <div className="mt-2">
                                    <StatusBadge
                                        variant={
                                            row.riskLevel === 'HIGH'
                                                ? 'critical'
                                                : row.riskLevel === 'MEDIUM'
                                                  ? 'warning'
                                                  : 'success'
                                        }
                                    >
                                        {row.riskLevel}
                                    </StatusBadge>
                                </div>
                            )}
                        </div>
                    )}
                />
            </Section>

            <Section title="Quick project cards" description="Tap a project for full detail">
                {snapshot.myProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No projects assigned to you as manager or owner. Ask an admin to set the project manager on
                        each project, or update the Project sheet and re-sync.
                    </p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {snapshot.myProjects.slice(0, 9).map((p) => {
                            const hours = projectHoursRows.find((r) => r.projectId === p.id);
                            const health = portfolioRows.find((r) => r.projectId === p.id);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => navigate(`/projects/${p.id}`)}
                                    className="dashboard-card p-4 text-left hover:border-brand-200 dark:hover:border-brand-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-card-foreground line-clamp-2">{p.name}</p>
                                        {health && (
                                            <span
                                                className={cn(
                                                    'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0',
                                                    health.health === 'Green' &&
                                                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
                                                    health.health === 'Amber' &&
                                                        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                                                    health.health === 'Red' &&
                                                        'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                                )}
                                            >
                                                {health.health}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {p.code} · {projectStatusLabel(projectStatusOf(p))}
                                    </p>
                                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                                        <span>{p.teamSize ?? 0} on team</span>
                                        {hours && (
                                            <>
                                                <span>{Math.round(hours.plannedHours)}h plan</span>
                                                <span>{Math.round(hours.actualHours)}h actual</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </Section>

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/pm/status-report')}>
                    Status Report
                </Button>
                <Button variant="outline" onClick={() => navigate('/pm/timeline')}>
                    Timeline
                </Button>
                <Button variant="outline" onClick={() => navigate('/time-entry')}>
                    Team Time
                </Button>
                <Button variant="outline" onClick={() => navigate('/pm/risks')}>
                    Delivery Risks
                </Button>
            </div>
        </PageContainer>
    );
}
