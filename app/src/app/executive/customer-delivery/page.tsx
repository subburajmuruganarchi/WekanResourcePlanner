import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection, HealthBadge } from '@/components/workspaces/shared';
import { useExecutiveMetrics } from '@/lib/use-executive-metrics';

export default function CustomerDeliveryPage() {
    const { customerRows, loading } = useExecutiveMetrics();

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Executive Command Center"
                title="Customer Delivery"
                description="Delivery health by project — project name is the customer account in your portfolio."
            />
            <WorkspaceSection title="Active customer projects">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : customerRows.length === 0 ? (
                        <p className="text-sm text-slate-500">No active projects in portfolio.</p>
                    ) : (
                        customerRows.map((project) => (
                            <div key={project.projectId} className="dashboard-card p-5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-semibold text-slate-900">{project.projectName}</h3>
                                    <HealthBadge health={project.health} />
                                </div>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <dt className="text-slate-500">Escalations</dt>
                                        <dd className="font-medium">{project.escalations}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Status</dt>
                                        <dd className="font-medium">
                                            {project.health === 'Green'
                                                ? 'On track'
                                                : project.health === 'Amber'
                                                  ? 'At risk'
                                                  : 'Critical'}
                                        </dd>
                                    </div>
                                </dl>
                                <p className="text-xs text-slate-500">
                                    Upcoming: {project.upcomingMilestone}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
