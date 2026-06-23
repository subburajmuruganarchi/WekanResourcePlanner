import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspaceMetricCard, WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';
import { useEmployees } from '@/lib/use-employees';
import { isActiveProject, projectStatusOf } from '@/lib/project-status';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';

export default function PmDashboardPage() {
    const navigate = useNavigate();
    const { projects, loading } = useProjects();
    const { employees, loading: teamLoading } = useEmployees({ allocatedToMyProjects: true, activeOnly: true });
    const [risks, setRisks] = useState<DeliveryRiskItem[]>([]);

    const myProjects = useMemo(
        () =>
            projects.filter((p) => {
                const status = projectStatusOf(p);
                return status !== 'Completed' && status !== 'OnHold';
            }),
        [projects]
    );

    const activeProjects = useMemo(() => myProjects.filter((p) => isActiveProject(p)), [myProjects]);

    const teamSize = useMemo(() => {
        const fromProjects = myProjects.reduce((sum, p) => sum + (p.teamSize ?? 0), 0);
        return Math.max(employees.length, fromProjects > 0 ? fromProjects : 0);
    }, [myProjects, employees.length]);

    useEffect(() => {
        fetchDeliveryRisks()
            .then((all) => {
                const ids = new Set(myProjects.map((p) => p.id));
                setRisks((all ?? []).filter((r) => ids.has(r.projectId)));
            })
            .catch(() => setRisks([]));
    }, [myProjects]);

    const atRisk = risks.filter((r) => r.level === 'MEDIUM' || r.level === 'HIGH').length;

    if (loading) {
        return (
            <PageContainer className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </PageContainer>
        );
    }

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Project Dashboard"
                description="Your delivery command view — projects, team, and execution health."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <WorkspaceMetricCard
                    label="My Projects"
                    value={String(myProjects.length)}
                    icon={FolderKanban}
                />
                <WorkspaceMetricCard
                    label="Active Projects"
                    value={String(activeProjects.length)}
                    icon={FolderKanban}
                    accent="sky"
                />
                <WorkspaceMetricCard
                    label="Team Members"
                    value={teamLoading ? '—' : String(teamSize)}
                    icon={Users}
                    accent="sky"
                />
                <WorkspaceMetricCard label="At Risk" value={String(atRisk)} accent="amber" icon={AlertTriangle} />
            </div>

            <WorkspaceSection title="Your projects">
                {myProjects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No projects assigned to you as manager or owner. Ask an admin to link your account on the
                        Project sheet.
                    </p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {myProjects.slice(0, 6).map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => navigate(`/projects/${p.id}`)}
                                className="dashboard-card p-4 text-left hover:border-brand-200 transition-colors"
                            >
                                <p className="font-semibold text-slate-900">{p.name}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {p.code} · {projectStatusOf(p)} · {p.teamSize ?? 0} on team
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </WorkspaceSection>

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
            </div>
        </PageContainer>
    );
}
