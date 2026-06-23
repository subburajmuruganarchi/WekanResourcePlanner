import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useEmployees } from '@/lib/use-employees';

export default function PmTeamPage() {
    const { employees, loading } = useEmployees({ allocatedToMyProjects: true });

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Project Workspace"
                title="Team"
                description="Resources allocated to your managed projects."
            />
            <WorkspaceSection title="Team roster">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading team…</p>
                    ) : (
                        employees.map((e) => (
                            <div key={e.id} className="dashboard-card p-4">
                                <p className="font-semibold text-slate-900">{e.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{e.jobRole || e.position || e.department}</p>
                                <p className="text-xs text-indigo-600 mt-2">{e.availability ?? 100}% available</p>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
