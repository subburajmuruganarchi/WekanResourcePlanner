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
    HealthBadge,
} from '@/components/workspaces/shared';
import { useDeliveryCommandMetrics } from '@/lib/use-delivery-metrics';
import { RaidSuggestionPanel } from '@/components/workspaces/ai/RaidSuggestionPanel';
import { KPIGridSkeleton } from '@/components/dashboard/KPICard';

export default function DeliveryCommandPage() {
    const navigate = useNavigate();
    const { metrics, portfolioRows, loading } = useDeliveryCommandMetrics();

    const sortedPortfolio = [...portfolioRows].sort((a, b) => {
        const order = { Red: 0, Amber: 1, Green: 2 };
        return order[a.health] - order[b.health] || b.confidence - a.confidence;
    });

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
                    <WorkspaceMetricCard label="Planner Gaps" value={String(metrics.resourceGaps)} icon={Users} />
                    <WorkspaceMetricCard label="Pending Timesheet Approvals" value={String(metrics.pendingDecisions)} accent="sky" icon={ClipboardList} />
                    <WorkspaceMetricCard label="Active Releases (est.)" value={String(metrics.upcomingReleases)} accent="emerald" icon={Rocket} />
                </div>
            )}

            <WorkspaceSection
                title="Portfolio at a glance"
                description="Managed projects — project name is the customer account"
            >
                <div className="dashboard-card overflow-hidden">
                    {loading ? (
                        <p className="p-6 text-sm text-slate-500">Loading portfolio…</p>
                    ) : sortedPortfolio.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">No active projects in your portfolio.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b bg-slate-50/80">
                                        <th className="px-4 py-3">Project</th>
                                        <th className="px-4 py-3">Health</th>
                                        <th className="px-4 py-3">Progress</th>
                                        <th className="px-4 py-3">Confidence</th>
                                        <th className="px-4 py-3">Owner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPortfolio.slice(0, 8).map((row) => (
                                        <tr key={row.projectId} className="border-b border-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {row.projectName}
                                            </td>
                                            <td className="px-4 py-3">
                                                <HealthBadge health={row.health} />
                                            </td>
                                            <td className="px-4 py-3">{row.progress}%</td>
                                            <td className="px-4 py-3 font-medium">{row.confidence}%</td>
                                            <td className="px-4 py-3 text-slate-500">{row.owner}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </WorkspaceSection>

            <WorkspaceSection title="AI RAID suggestions" description="Planner-detected risks — approve to add to your RAID board (RAID remains independent).">
                <RaidSuggestionPanel />
            </WorkspaceSection>

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
