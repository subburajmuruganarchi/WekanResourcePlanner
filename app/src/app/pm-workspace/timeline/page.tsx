import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useProjects } from '@/lib/use-projects';
import { isActiveProject } from '@/lib/project-status';

const PHASES = ['Requirements', 'Development', 'Testing', 'Release'];

export default function PmTimelinePage() {
    const { projects } = useProjects();
    const active = projects.filter((p) => isActiveProject(p)).slice(0, 5);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Project Timeline"
                description="Gantt-style milestone view across your managed projects."
            />
            <WorkspaceSection title="Delivery phases">
                <div className="space-y-6">
                    {active.map((p) => (
                        <div key={p.id} className="dashboard-card p-5">
                            <p className="font-semibold text-slate-900 mb-4">{p.name}</p>
                            <div className="grid grid-cols-4 gap-2">
                                {PHASES.map((phase, i) => (
                                    <div key={phase} className="text-center">
                                        <div className="h-2 rounded-full bg-slate-100 mb-2 overflow-hidden">
                                            <div
                                                className="h-full bg-brand-500 rounded-full"
                                                style={{ width: `${Math.min(100, 40 + i * 18)}%` }}
                                            />
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-600">{phase}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                {p.startDate?.slice(0, 10)} → {p.endDate?.slice(0, 10) ?? 'TBD'}
                            </p>
                        </div>
                    ))}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
