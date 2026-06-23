import { useNavigate } from 'react-router-dom';
import {
    FolderKanban,
    AlertTriangle,
    Ban,
    Users,
    ClipboardList,
    Rocket,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
    WorkspaceMetricCard,
    WorkspacePageHeader,
    WorkspaceSection,
} from '@/components/workspaces/shared';
import { useDeliveryCommandMetrics } from '@/lib/use-delivery-metrics';
import { KPIGridSkeleton } from '@/components/dashboard/KPICard';

export default function DeliveryCommandPage() {
    const navigate = useNavigate();
    const { metrics, loading } = useDeliveryCommandMetrics();

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="Delivery Command Center"
                description="Portfolio operational cockpit — risks, capacity, and decisions in one place."
                action={
                    <Button className="enterprise-gradient-bg text-white border-0" onClick={() => navigate('/delivery/raid')}>
                        Open RAID Board
                    </Button>
                }
            />

            {loading ? (
                <KPIGridSkeleton />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <WorkspaceMetricCard label="Managed Projects" value={String(metrics.managedProjects)} icon={FolderKanban} />
                    <WorkspaceMetricCard label="Projects At Risk" value={String(metrics.atRisk)} accent="amber" icon={AlertTriangle} />
                    <WorkspaceMetricCard label="Blocked Projects" value={String(metrics.blocked)} accent="rose" icon={Ban} />
                    <WorkspaceMetricCard label="Resource Gaps" value={String(metrics.resourceGaps)} icon={Users} />
                    <WorkspaceMetricCard label="Pending Decisions" value={String(metrics.pendingDecisions)} accent="sky" icon={ClipboardList} />
                    <WorkspaceMetricCard label="Upcoming Releases" value={String(metrics.upcomingReleases)} accent="emerald" icon={Rocket} />
                </div>
            )}

            <WorkspaceSection title="Quick actions">
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate('/allocation')}>Resource Planning</Button>
                    <Button variant="outline" onClick={() => navigate('/pm-approvals')}>Approvals</Button>
                    <Button variant="outline" onClick={() => navigate('/delivery/recommendations')}>AI Recommendations</Button>
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
