import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderKanban,
    Bell,
    ArrowRight,
    CalendarRange,
    Gauge,
    Layers,
    User,
    Sparkles,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    EmptyState,
    PageSkeleton,
    StatusBadge,
} from '@/components/patterns';
import { EmployeeWorkspaceCharts } from '@/app/workspace/components/employee-workspace-charts';
import { useAuth } from '@/lib/auth-context';
import { useProjects, PROJECTS_CHANGED_EVENT } from '@/lib/use-projects';
import { useEmployee } from '@/lib/use-employees';
import { useNotifications } from '@/lib/use-notifications';
import { useUtilizationVariance } from '@/lib/use-utilization';
import {
    buildDashboardPeriodRange,
    formatDashboardPeriodLabel,
    getCurrentMonthValue,
    getCurrentWeekStart,
} from '@/lib/dashboard-period';
import {
    allocatedPercent,
    buildEmployeeProjectRows,
    buildEmployeeWeekSnapshot,
    countActiveProjects,
    topSkills,
} from '@/lib/employee-dashboard-metrics';
import { cn } from '@/lib/utils';

function formatDeltaHours(delta: number): string {
    if (delta === 0) return 'On plan';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${Math.round(delta)}h vs plan`;
}

export default function EmployeeWorkspacePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
    const { employee, loading: profileLoading } = useEmployee(user?.id);
    const { notifications, unreadCount } = useNotifications();
    const { data: utilizationData, loading: utilLoading, fetchVariance } = useUtilizationVariance();

    const weekStart = getCurrentWeekStart();
    const periodRange = useMemo(
        () => buildDashboardPeriodRange('week', weekStart, getCurrentMonthValue()),
        [weekStart]
    );
    const periodLabel = formatDashboardPeriodLabel('week', periodRange);

    const weekSnapshot = useMemo(
        () => buildEmployeeWeekSnapshot(utilizationData?.rows ?? []),
        [utilizationData?.rows]
    );

    const projectRows = useMemo(
        () => buildEmployeeProjectRows(projects, user?.id, utilizationData?.rows ?? []),
        [projects, user?.id, utilizationData?.rows]
    );

    const activeProjectCount = countActiveProjects(projects);
    const allocationPct = allocatedPercent(employee);
    const skills = topSkills(employee);

    useEffect(() => {
        const onProjectsChanged = () => void refetchProjects();
        window.addEventListener(PROJECTS_CHANGED_EVENT, onProjectsChanged);
        return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, onProjectsChanged);
    }, [refetchProjects]);

    useEffect(() => {
        if (!user?.id) return;
        void fetchVariance({
            weekStartFrom: periodRange.weekStartFrom,
            weekStartTo: periodRange.weekStartTo,
            employeeId: user.id,
        });
    }, [user?.id, fetchVariance, periodRange.weekStartFrom, periodRange.weekStartTo]);

    if (projectsLoading || profileLoading) {
        return <PageSkeleton />;
    }

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="My Workspace"
                title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`}
                description="Your assignments, weekly plan, and allocation at a glance — no timesheet entry required."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => navigate('/allocation')}
                    >
                        View my allocation
                        <CalendarRange className="w-4 h-4" />
                    </Button>
                }
            />

            <MetricGrid columns={{ sm: 2, xl: 4 }}>
                <MetricCard
                    label="Active Projects"
                    value={activeProjectCount}
                    hint={`${projects.length} total assigned`}
                    icon={FolderKanban}
                    accent="brand"
                    onClick={() => navigate('/projects')}
                />
                <MetricCard
                    label="Planned This Week"
                    value={utilLoading ? '—' : weekSnapshot.plannedHours > 0 ? `${Math.round(weekSnapshot.plannedHours)}h` : '—'}
                    hint={periodLabel}
                    icon={CalendarRange}
                    accent="sky"
                />
                <MetricCard
                    label="Actual This Week"
                    value={utilLoading ? '—' : weekSnapshot.actualHours > 0 ? `${Math.round(weekSnapshot.actualHours)}h` : '—'}
                    hint={utilLoading ? 'Loading…' : formatDeltaHours(weekSnapshot.deltaHours)}
                    icon={Gauge}
                    accent="violet"
                />
                <MetricCard
                    label="My Allocation"
                    value={allocationPct != null ? `${allocationPct}%` : '—'}
                    hint={
                        allocationPct != null
                            ? allocationPct >= 90
                                ? 'Fully allocated'
                                : `${100 - allocationPct}% bench capacity`
                            : 'From resource profile'
                    }
                    icon={Layers}
                    accent="emerald"
                    onClick={() => navigate('/allocation')}
                />
            </MetricGrid>

            <Section title="This week" description={periodLabel}>
                <EmployeeWorkspaceCharts
                    projectRows={projectRows}
                    plannedHours={weekSnapshot.plannedHours}
                    actualHours={weekSnapshot.actualHours}
                />
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <Section title="My Projects">
                        {projectRows.length === 0 ? (
                            <EmptyState
                                icon={FolderKanban}
                                title="No projects assigned"
                                description="You are not on any project rosters yet. Your PM or delivery manager will add you when staffing is confirmed."
                                action={
                                    <Button variant="outline" onClick={() => navigate('/allocation')}>
                                        Check allocation grid
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="space-y-2">
                                {projectRows.map((row) => (
                                    <button
                                        key={row.projectId}
                                        type="button"
                                        onClick={() => navigate(`/projects/${row.projectId}`)}
                                        className="dashboard-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-left w-full hover:border-brand-200 hover:shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <FolderKanban className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-medium text-card-foreground truncate">
                                                        {row.projectName}
                                                    </p>
                                                    <StatusBadge variant={row.isActive ? 'success' : 'neutral'}>
                                                        {row.status}
                                                    </StatusBadge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {row.projectCode} · PM {row.managerName}
                                                </p>
                                                {(row.plannedHours > 0 || row.actualHours > 0) && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {Math.round(row.plannedHours)}h planned ·{' '}
                                                        {Math.round(row.actualHours)}h actual
                                                        {row.deltaHours !== 0 && (
                                                            <span
                                                                className={cn(
                                                                    'ml-1',
                                                                    row.deltaHours > 0
                                                                        ? 'text-amber-600 dark:text-amber-400'
                                                                        : 'text-sky-600 dark:text-sky-400'
                                                                )}
                                                            >
                                                                ({formatDeltaHours(row.deltaHours)})
                                                            </span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 sm:ml-auto">
                                            {row.allocationPercent != null && (
                                                <Badge variant="secondary">{row.allocationPercent}%</Badge>
                                            )}
                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                <div className="space-y-4">
                    <div className="dashboard-card p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                            <User className="w-4 h-4 text-brand-600" />
                            My Profile
                        </h3>
                        <dl className="mt-3 space-y-2 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Role</dt>
                                <dd className="font-medium text-card-foreground">
                                    {employee?.jobRole || employee?.position || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Department</dt>
                                <dd className="font-medium text-card-foreground">
                                    {employee?.department || '—'}
                                </dd>
                            </div>
                            {weekSnapshot.utilizationPercent != null && (
                                <div>
                                    <dt className="text-muted-foreground">Week utilization</dt>
                                    <dd className="font-medium text-card-foreground">
                                        {weekSnapshot.utilizationPercent}% actual vs planned
                                    </dd>
                                </div>
                            )}
                        </dl>
                        {skills.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Skills
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {skills.map((skill) => (
                                        <Badge key={skill} variant="outline" className="text-xs">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="dashboard-card p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                            <Bell className="w-4 h-4 text-brand-600" />
                            Notifications
                            {unreadCount > 0 && (
                                <Badge variant="default" className="ml-auto text-xs">
                                    {unreadCount}
                                </Badge>
                            )}
                        </h3>
                        {notifications.length === 0 ? (
                            <p className="text-sm text-muted-foreground mt-3">No recent notifications</p>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {notifications.slice(0, 4).map((n) => (
                                    <li key={n.id} className="text-sm text-muted-foreground">
                                        <span className={n.read ? '' : 'font-medium text-card-foreground'}>
                                            {n.title}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
