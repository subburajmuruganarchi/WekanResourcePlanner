import { useNavigate } from 'react-router-dom';
import { Clock, Target, FolderKanban, Bell, CheckCircle2, ArrowRight, Calendar, ClipboardList, Gauge } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, MetricCard, MetricGrid, EmptyState } from '@/components/patterns';
import { CopilotSuggestedActions } from '@/components/workspaces/ai/CopilotSuggestedActions';
import { useAuth } from '@/lib/auth-context';
import { useProjects, PROJECTS_CHANGED_EVENT } from '@/lib/use-projects';
import { useOkrs } from '@/lib/use-okrs';
import { useNotifications } from '@/lib/use-notifications';
import { useUtilizationVariance } from '@/lib/use-utilization';
import { api } from '@/lib/api';
import { useEffect, useState, useMemo } from 'react';
import { getCurrentWeekStart } from '@/lib/time-entry-week';
import { isActiveProject } from '@/lib/project-status';
import {
    buildDashboardPeriodRange,
    getCurrentMonthValue,
} from '@/lib/dashboard-period';

function getCurrentQuarter(): string {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q}-${now.getFullYear()}`;
}

export default function EmployeeWorkspacePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
    const { okrs, overallScore, loading: okrLoading } = useOkrs(user?.id, getCurrentQuarter());
    const { notifications, unreadCount } = useNotifications();
    const { data: utilizationData, loading: utilLoading, fetchVariance } = useUtilizationVariance();
    const [timesheetStatus, setTimesheetStatus] = useState<'Draft' | 'Submitted' | 'Approved' | 'Unknown'>('Unknown');
    const [weekHours, setWeekHours] = useState(0);
    const [plannedHours, setPlannedHours] = useState(0);
    const [targetHours] = useState(40);

    const myUtilization = useMemo(() => {
        const summary = utilizationData?.summary;
        if (!summary || summary.totalPlannedHours <= 0) return null;
        return Math.min(100, Math.round((summary.totalActualHours / summary.totalPlannedHours) * 100));
    }, [utilizationData]);

    const pendingActions = useMemo(() => {
        const items: { label: string; action: () => void }[] = [];
        if (timesheetStatus === 'Draft') {
            items.push({ label: 'Submit weekly timesheet', action: () => navigate('/time-entry') });
        }
        if (timesheetStatus === 'Submitted') {
            items.push({ label: 'Timesheet awaiting approval', action: () => navigate('/time-entry') });
        }
        if (unreadCount > 0) {
            items.push({ label: `${unreadCount} unread notification(s)`, action: () => {} });
        }
        if (okrs.length > 0 && overallScore < 50) {
            items.push({ label: 'Update OKR progress', action: () => navigate('/okrs') });
        }
        return items;
    }, [timesheetStatus, unreadCount, okrs.length, overallScore, navigate]);

    const myProjects = [...projects].sort((a, b) => {
        const aRank = isActiveProject(a) ? 0 : 1;
        const bRank = isActiveProject(b) ? 0 : 1;
        return aRank - bRank || a.name.localeCompare(b.name);
    });

    useEffect(() => {
        const onProjectsChanged = () => void refetchProjects();
        window.addEventListener(PROJECTS_CHANGED_EVENT, onProjectsChanged);
        return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, onProjectsChanged);
    }, [refetchProjects]);

    useEffect(() => {
        if (!user?.id) return;
        const week = getCurrentWeekStart();
        api.get(`/time-entries?employeeId=${user.id}&week=${week}`)
            .then((res: unknown) => {
                const data = (res as { data?: { data?: { hours?: number; status?: string }[] } })?.data?.data ?? [];
                const entries = Array.isArray(data) ? data : [];
                setWeekHours(entries.reduce((s, e) => s + (e.hours ?? 0), 0));
                const statuses = entries.map((e) => e.status).filter(Boolean);
                if (statuses.every((s) => s === 'PM_APPROVED' || s === 'PM_Approved')) setTimesheetStatus('Approved');
                else if (statuses.some((s) => s === 'SUBMITTED' || s === 'Submitted')) setTimesheetStatus('Submitted');
                else setTimesheetStatus('Draft');
            })
            .catch(() => setTimesheetStatus('Unknown'));

        api.get(`/time-entries/estimates?employeeId=${user.id}&week=${week}`)
            .then((res: unknown) => {
                const est = (res as { data?: { data?: { totalEstimated?: number } } })?.data?.data;
                setPlannedHours(est?.totalEstimated ?? 0);
            })
            .catch(() => setPlannedHours(0));

        const period = buildDashboardPeriodRange('week', week, getCurrentMonthValue());
        void fetchVariance({
            weekStartFrom: period.weekStartFrom,
            weekStartTo: period.weekStartTo,
            employeeId: user.id,
        });
    }, [user?.id, fetchVariance]);

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="My Workspace"
                title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`}
                description="Your daily command center — work, time, goals, and actions in one place."
                action={
                    <Button className="enterprise-gradient-bg text-white border-0 gap-2" onClick={() => navigate('/time-entry')}>
                        Open Time Tracking
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                }
            />

            <CopilotSuggestedActions />

            <MetricGrid columns={{ sm: 2, xl: 4 }}>
                <MetricCard
                    label="Timesheet Status"
                    value={timesheetStatus}
                    hint={`${weekHours}h of ${targetHours}h logged this week`}
                    icon={Clock}
                    accent="brand"
                    onClick={() => navigate('/time-entry')}
                />
                <MetricCard
                    label="Week Progress"
                    value={`${Math.min(100, Math.round((weekHours / targetHours) * 100))}%`}
                    hint={weekHours >= targetHours ? 'Weekly target met' : `${targetHours - weekHours}h remaining`}
                    icon={Calendar}
                    accent="sky"
                />
                <MetricCard
                    label="Planned This Week"
                    value={plannedHours > 0 ? `${Math.round(plannedHours)}h` : '—'}
                    hint={plannedHours > 0 ? 'From your allocation plan' : 'No allocation plan yet'}
                    icon={Gauge}
                    accent="violet"
                />
                <MetricCard
                    label="My Utilization"
                    value={utilLoading ? '—' : myUtilization != null ? `${myUtilization}%` : '—'}
                    hint={utilLoading ? 'Loading…' : 'Actual vs planned hours this week'}
                    icon={Gauge}
                    accent="emerald"
                />
                <MetricCard
                    label="My OKRs"
                    value={okrLoading ? '—' : `${overallScore}%`}
                    hint={okrLoading ? 'Loading…' : `${okrs.length} objective(s) this quarter`}
                    icon={Target}
                    accent="emerald"
                    onClick={() => navigate('/okrs')}
                />
            </MetricGrid>

            <Section title="My Projects">
                {projectsLoading ? (
                    <p className="text-sm text-muted-foreground p-4" role="status">Loading your projects…</p>
                ) : myProjects.length === 0 ? (
                    <EmptyState
                        icon={FolderKanban}
                        title="No projects assigned"
                        description="You are not allocated to any active projects yet. Ask your PM to add you to the roster."
                        action={
                            <Button variant="outline" onClick={() => navigate('/time-entry')}>
                                Open Time Tracking
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {myProjects.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="dashboard-card p-4 flex items-center gap-3 text-left w-full hover:border-brand-200 hover:shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <FolderKanban className="w-5 h-5 text-brand-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium text-card-foreground truncate">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.code}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="dashboard-card p-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                        <ClipboardList className="w-4 h-4 text-brand-600" />
                        Pending Actions
                    </h3>
                    {pendingActions.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            You&apos;re all caught up
                        </p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {pendingActions.map((item) => (
                                <li key={item.label}>
                                    <button
                                        type="button"
                                        onClick={item.action}
                                        className="text-sm text-brand-600 hover:underline text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="dashboard-card p-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
                        <Bell className="w-4 h-4 text-brand-600" />
                        Recent Notifications
                    </h3>
                    {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-3">No recent notifications</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {notifications.slice(0, 3).map((n) => (
                                <li key={n.id} className="text-sm text-muted-foreground">
                                    <span className={n.read ? '' : 'font-medium text-card-foreground'}>{n.title}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <Section title="Announcements">
                <div className="dashboard-card p-4 text-sm text-muted-foreground">
                    Company-wide delivery review is scheduled for Friday. Ensure timesheets are submitted by EOD Thursday.
                </div>
            </Section>
        </PageContainer>
    );
}
