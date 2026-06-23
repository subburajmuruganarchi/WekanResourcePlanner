import { useNavigate } from 'react-router-dom';
import { FolderKanban, Users, AlertTriangle, FileBarChart } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspaceMetricCard, WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';
import { useEmployees } from '@/lib/use-employees';

export default function PmDashboardPage() {
    const navigate = useNavigate();
    const { projects, loading } = useProjects();
    const { employees } = useEmployees({ allocatedToMyProjects: true });
    const active = projects.filter((p) => p.status === 'Active');

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Project Dashboard"
                description="Your delivery command view — projects, team, and execution health."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <WorkspaceMetricCard label="Active Projects" value={loading ? '—' : String(active.length)} icon={FolderKanban} />
                <WorkspaceMetricCard label="Team Members" value={String(employees.length)} icon={Users} accent="sky" />
                <WorkspaceMetricCard label="At Risk" value={String(Math.min(active.length, 2))} accent="amber" icon={AlertTriangle} />
                <WorkspaceMetricCard label="Status Due" value="This week" icon={FileBarChart} />
            </div>

            <WorkspaceSection title="Your projects">
                <div className="grid gap-3 md:grid-cols-2">
                    {active.slice(0, 6).map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => navigate(`/projects/${p.id}`)}
                            className="dashboard-card p-4 text-left hover:border-indigo-200 transition-colors"
                        >
                            <p className="font-semibold text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{p.code} · {p.status}</p>
                        </button>
                    ))}
                </div>
            </WorkspaceSection>

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/pm/status-report')}>Status Report</Button>
                <Button variant="outline" onClick={() => navigate('/pm/timeline')}>Timeline</Button>
                <Button variant="outline" onClick={() => navigate('/time-entry')}>Team Time</Button>
            </div>
        </PageContainer>
    );
}
