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
                description="Customer-centric delivery health, milestones, and escalations."
            />
            <WorkspaceSection title="Customer portfolio">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading…</p>
                    ) : (
                        customerRows.map((c) => (
                            <div key={c.customer} className="dashboard-card p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900">{c.customer}</h3>
                                    <HealthBadge health={c.health} />
                                </div>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <dt className="text-slate-500">Projects</dt>
                                        <dd className="font-medium">{c.projectCount}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Escalations</dt>
                                        <dd className="font-medium">{c.escalations}</dd>
                                    </div>
                                </dl>
                                <p className="text-xs text-slate-500">
                                    Upcoming: {c.upcomingMilestone}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
