import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';
import { isActiveProject, projectStatusLabel } from '@/lib/project-status';
import { Calendar } from 'lucide-react';

export default function PmTimelinePage() {
    const { projects } = useProjects();
    const active = projects.filter((p) => isActiveProject(p));

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Project Timeline"
                description="Schedule overview for your managed projects."
            />
            <WorkspaceSection title="Active projects">
                {active.length === 0 ? (
                    <p className="text-sm text-slate-500 p-4">No active projects assigned to you.</p>
                ) : (
                    <div className="space-y-4">
                        {active.map((p) => (
                            <div key={p.id} className="dashboard-card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{p.name}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">{p.code}</p>
                                    </div>
                                    <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
                                        {projectStatusLabel(p.status)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>
                                        {p.startDate?.slice(0, 10)} → {p.endDate?.slice(0, 10) ?? 'Ongoing'}
                                    </span>
                                </div>
                                {(p.teamSize ?? 0) > 0 && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        {p.teamSize} team member{p.teamSize === 1 ? '' : 's'} allocated
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </WorkspaceSection>
        </PageContainer>
    );
}
