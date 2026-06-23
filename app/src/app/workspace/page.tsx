import { useNavigate } from 'react-router-dom';
import { Clock, Target, FolderKanban, Bell, CheckCircle2, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useAuth } from '@/lib/auth-context';
import { useProjects } from '@/lib/use-projects';
import { useOkrs } from '@/lib/use-okrs';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { getCurrentWeekStart } from '@/lib/time-entry-week';

function getCurrentQuarter(): string {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q}-${now.getFullYear()}`;
}

export default function EmployeeWorkspacePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { projects } = useProjects();
    const { okrs, overallScore, loading: okrLoading } = useOkrs(user?.id, getCurrentQuarter());
    const [timesheetStatus, setTimesheetStatus] = useState<'Draft' | 'Submitted' | 'Approved' | 'Unknown'>('Unknown');
    const [weekHours, setWeekHours] = useState(0);

    const myProjects = projects.slice(0, 4);

    useEffect(() => {
        if (!user?.id) return;
        const week = getCurrentWeekStart();
        api.get(`/time-entries?employeeId=${user.id}&week=${week}`)
            .then((res: unknown) => {
                const data = (res as { data?: { data?: { hours?: number; status?: string }[] } })?.data?.data ?? [];
                const entries = Array.isArray(data) ? data : [];
                setWeekHours(entries.reduce((s, e) => s + (e.hours ?? 0), 0));
                const statuses = entries.map((e) => e.status).filter(Boolean);
                if (statuses.every((s) => s === 'PM_APPROVED')) setTimesheetStatus('Approved');
                else if (statuses.some((s) => s === 'SUBMITTED')) setTimesheetStatus('Submitted');
                else setTimesheetStatus('Draft');
            })
            .catch(() => setTimesheetStatus('Unknown'));
    }, [user?.id]);

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="dashboard-card p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-600" />
                        Today&apos;s Work
                    </h3>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                        Focus on active project deliverables and close open timesheet entries for this week.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/time-entry')}>
                        Log time today
                    </Button>
                </div>

                <div className="dashboard-card p-5">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand-600" />
                        Timesheet Status
                    </h3>
                    <p className="text-2xl font-bold text-slate-900 mt-3">{timesheetStatus}</p>
                    <p className="text-xs text-slate-500 mt-1">{weekHours}h logged this week</p>
                </div>
            </div>

            <WorkspaceSection title="My Projects">
                <div className="grid gap-3 sm:grid-cols-2">
                    {myProjects.map((p) => (
                        <div key={p.id} className="dashboard-card p-4 flex items-center gap-3">
                            <FolderKanban className="w-5 h-5 text-brand-600" />
                            <div>
                                <p className="font-medium text-slate-900">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.code}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </WorkspaceSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="dashboard-card p-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Target className="w-4 h-4 text-brand-600" />
                        My OKRs
                    </h3>
                    {!okrLoading && (
                        <>
                            <p className="text-2xl font-bold text-brand-600 mt-2">{overallScore}%</p>
                            <p className="text-xs text-slate-500">{okrs.length} objective(s) this quarter</p>
                        </>
                    )}
                    <Button variant="link" className="px-0 mt-2" onClick={() => navigate('/okrs')}>
                        View OKRs
                    </Button>
                </div>

                <div className="dashboard-card p-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Bell className="w-4 h-4 text-brand-600" />
                        Pending Actions
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {timesheetStatus === 'Draft' && <li>Submit weekly timesheet</li>}
                        <li>Review project announcements</li>
                        <li>Update OKR progress if due</li>
                    </ul>
                </div>
            </div>

            <WorkspaceSection title="Announcements">
                <div className="dashboard-card p-4 text-sm text-slate-600">
                    Company-wide delivery review is scheduled for Friday. Ensure timesheets are submitted by EOD Thursday.
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
