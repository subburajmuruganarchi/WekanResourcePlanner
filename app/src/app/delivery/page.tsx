import { useNavigate } from 'react-router-dom';
import {
    FolderKanban,
    AlertTriangle,
    Ban,
    Users,
    ClipboardList,
    Rocket,
    Sparkles,
    ArrowRight,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
    PageHeader,
    Section,
    MetricCard,
    MetricGrid,
    EnterpriseDataTable,
    portfolioTableColumns,
    StatusBadge,
    EmptyState,
} from '@/components/patterns';
import { CopilotSuggestedActions } from '@/components/workspaces/ai/CopilotSuggestedActions';
import { useDeliveryCommandMetrics } from '@/lib/use-delivery-metrics';
import { useDeliveryRecommendations } from '@/lib/use-delivery-recommendations';
import { MetricGridSkeleton } from '@/components/patterns/skeleton';
import { DeliveryPortfolioCharts } from './components/delivery-portfolio-charts';

export default function DeliveryCommandPage() {
    const navigate = useNavigate();
    const { metrics, portfolioRows, loading } = useDeliveryCommandMetrics();
    const { items: recommendations, loading: recLoading } = useDeliveryRecommendations();

    const topRecommendations = recommendations.slice(0, 3);
    const portfolioColumns = portfolioTableColumns({ includeOwner: true });

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Delivery Command"
                title="Delivery Command Center"
                description="Portfolio operational cockpit — risks, capacity, and decisions in one place."
                action={
                    <Button className="enterprise-gradient-bg text-white border-0" onClick={() => navigate('/delivery/recommendations')}>
                        Suggested Actions
                    </Button>
                }
            />

            <CopilotSuggestedActions />

            {loading ? (
                <MetricGridSkeleton count={6} />
            ) : (
                <MetricGrid columns={{ sm: 2, xl: 3 }}>
                    <MetricCard label="Managed Projects" value={String(metrics.managedProjects)} icon={FolderKanban} onClick={() => navigate('/projects')} />
                    <MetricCard label="Projects At Risk" value={String(metrics.atRisk)} accent="amber" icon={AlertTriangle} />
                    <MetricCard label="Blocked Projects" value={String(metrics.blocked)} accent="rose" icon={Ban} />
                    <MetricCard label="Planner Gaps" value={String(metrics.resourceGaps)} icon={Users} onClick={() => navigate('/allocation')} />
                    <MetricCard
                        label="Pending Approvals"
                        value={String(metrics.pendingDecisions)}
                        accent="sky"
                        icon={ClipboardList}
                        onClick={() => navigate('/pm-approvals')}
                    />
                    <MetricCard label="Active Releases (est.)" value={String(metrics.upcomingReleases)} accent="emerald" icon={Rocket} />
                </MetricGrid>
            )}

            <Section
                title="Portfolio trends"
                description="Health distribution and delivery progress across active projects"
            >
                {loading ? (
                    <div className="dashboard-card p-6 enterprise-skeleton h-48" role="status" />
                ) : (
                    <DeliveryPortfolioCharts rows={portfolioRows} />
                )}
            </Section>

            <Section
                title="Portfolio at a glance"
                description="Active projects — sortable, searchable, exportable"
            >
                <EnterpriseDataTable
                    columns={portfolioColumns}
                    rows={portfolioRows}
                    rowKey={(r) => r.projectId}
                    loading={loading}
                    exportFilename="delivery-portfolio"
                    storageKey="r360-delivery-portfolio-cols"
                    onRowClick={(row) => navigate(`/projects/${row.projectId}`)}
                    emptyTitle="No active projects"
                    emptyDescription="No active projects in your portfolio."
                    mobileCardRender={(row) => (
                        <div>
                            <p className="font-medium text-card-foreground">{row.projectName}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <StatusBadge variant={row.health === 'Green' ? 'success' : row.health === 'Amber' ? 'warning' : 'critical'}>
                                    {row.health}
                                </StatusBadge>
                                <span className="text-xs text-muted-foreground">{row.progress}% progress · {row.confidence}% confidence</span>
                            </div>
                        </div>
                    )}
                />
            </Section>

            <Section
                title="Suggested actions"
                description="Top recommendations from allocation and planner signals"
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate('/delivery/recommendations')}>
                        View all
                    </Button>
                }
            >
                {recLoading ? (
                    <div className="dashboard-card p-6 enterprise-skeleton h-32" role="status" />
                ) : topRecommendations.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No actions needed"
                        description="No delivery risks or planner gaps detected in your portfolio."
                    />
                ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                        {topRecommendations.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => navigate(`/projects/${item.projectId}`)}
                                className="dashboard-card p-4 text-left hover:border-brand-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <StatusBadge variant={item.severity === 'HIGH' ? 'critical' : item.severity === 'MEDIUM' ? 'warning' : 'neutral'}>
                                        {item.priority}
                                    </StatusBadge>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </div>
                                <p className="font-semibold text-card-foreground mt-2 text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.recommendedAction}</p>
                                <p className="text-[10px] text-muted-foreground mt-2">{item.projectName}</p>
                            </button>
                        ))}
                    </div>
                )}
            </Section>

            <Section title="Quick actions">
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate('/projects')}>Employees & Projects</Button>
                    <Button variant="outline" onClick={() => navigate('/allocation')}>Resource Planning</Button>
                    <Button variant="outline" onClick={() => navigate('/approvals')}>Approvals</Button>
                    <Button variant="outline" onClick={() => navigate('/delivery/capacity')}>Capacity Forecast</Button>
                </div>
            </Section>
        </PageContainer>
    );
}
