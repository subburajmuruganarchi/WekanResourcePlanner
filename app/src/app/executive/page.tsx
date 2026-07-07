import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    FolderKanban,
    Users,
    Gauge,
    Target,
    AlertTriangle,
    Sparkles,
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
} from '@/components/patterns';
import { MetricGridSkeleton } from '@/components/patterns/skeleton';
import { useExecutiveMetrics } from '@/lib/use-executive-metrics';
import { useDashboardInsight } from '@/lib/use-ai-insights';
import {
    buildDashboardPeriodRange,
    getCurrentWeekStart,
    getCurrentMonthValue,
} from '@/lib/dashboard-period';
import { DeliveryPortfolioCharts } from '@/app/delivery/components/delivery-portfolio-charts';

export default function ExecutiveDashboardPage() {
    const navigate = useNavigate();
    const { stats, portfolioRows, loading } = useExecutiveMetrics();
    const { insight, loading: insightLoading, fetchInsight } = useDashboardInsight();

    const periodRange = useMemo(
        () => buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue()),
        []
    );

    useEffect(() => {
        void fetchInsight(periodRange);
    }, [fetchInsight, periodRange]);

    const sortedRows = useMemo(
        () =>
            [...portfolioRows].sort((a, b) => {
                const order = { Red: 0, Amber: 1, Green: 2 };
                return order[a.health] - order[b.health];
            }),
        [portfolioRows]
    );

    const portfolioColumns = portfolioTableColumns({ includeOwner: false });

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Enterprise Command Center"
                title="Enterprise Dashboard"
                description="Organization-wide read-only view of delivery health and workforce capacity. Drill into Projects or Resource Planning for details."
            />

            {loading || !stats ? (
                <MetricGridSkeleton count={4} />
            ) : (
                <>
                    <Section title="Company Delivery Health" description="Projects running and those needing attention.">
                        <MetricGrid columns={{ sm: 2, xl: 4 }}>
                            <MetricCard label="Active Projects" value={String(stats.activeProjects)} icon={FolderKanban} hint="Projects in delivery (Active)." />
                            <MetricCard label="On Track" value={String(stats.onTrack)} accent="emerald" icon={Activity} hint="No open delivery risk." />
                            <MetricCard label="At Risk" value={String(stats.atRisk)} accent="amber" icon={AlertTriangle} hint="Medium-severity risks." />
                            <MetricCard label="Critical" value={String(stats.critical)} accent="rose" icon={AlertTriangle} hint="High-severity — act this week." />
                        </MetricGrid>
                    </Section>

                    <Section title="Resource Health" description="Workforce utilization and bench capacity.">
                        <MetricGrid columns={{ sm: 2, xl: 4 }}>
                            <MetricCard label="Total Workforce" value={String(stats.totalEmployees)} icon={Users} accent="sky" />
                            <MetricCard label="Utilization" value={`${stats.utilization}%`} icon={Gauge} hint="~80–90% is healthy." />
                            <MetricCard label="Bench Capacity" value={String(stats.benchCount)} accent="slate" hint="Spare capacity available." />
                            <MetricCard
                                label="Hiring Risk"
                                value={stats.hiringRisk}
                                accent={stats.hiringRisk === 'High' ? 'rose' : 'amber'}
                            />
                        </MetricGrid>
                    </Section>

                    <div className="dashboard-card p-6 bg-gradient-to-br from-brand-50/80 to-card border-brand-100">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Delivery Confidence Score</p>
                                <p className="text-4xl font-bold text-card-foreground mt-2">{stats.deliveryConfidence}%</p>
                                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                                    Blends plan delivery ({stats.planDeliveryPercent}%), delivery risk, and utilization.
                                </p>
                            </div>
                            <Target className="w-12 h-12 text-brand-500 opacity-80 hidden md:block" aria-hidden />
                        </div>
                    </div>

                    {!insightLoading && insight?.narrative && (
                        <div className="dashboard-card p-6 border-brand-100">
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Executive Brief
                            </p>
                            <p className="text-sm text-card-foreground leading-relaxed">{insight.narrative}</p>
                            {insight.bullets && insight.bullets.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {insight.bullets.slice(0, 4).map((b) => (
                                        <li key={b} className="text-xs text-muted-foreground flex gap-2">
                                            <span className="text-brand-500">•</span>
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <Section title="Portfolio trends" description="Health distribution and progress vs. confidence.">
                        <DeliveryPortfolioCharts rows={portfolioRows} />
                    </Section>
                </>
            )}

            <Section
                title="Portfolio at a glance"
                description="Top projects by delivery risk"
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate('/executive/risk-radar')}>
                        View risks
                    </Button>
                }
            >
                <EnterpriseDataTable
                    columns={portfolioColumns}
                    rows={sortedRows}
                    rowKey={(r) => r.projectId}
                    loading={loading}
                    exportFilename="executive-portfolio"
                    storageKey="r360-executive-portfolio-cols"
                    onRowClick={(row) => navigate(`/projects/${row.projectId}`)}
                    emptyTitle="No portfolio data"
                    mobileCardRender={(row) => (
                        <div>
                            <p className="font-medium">{row.projectName}</p>
                            <div className="flex gap-2 mt-1">
                                <StatusBadge variant={row.health === 'Green' ? 'success' : row.health === 'Amber' ? 'warning' : 'critical'}>
                                    {row.health}
                                </StatusBadge>
                                <span className="text-xs text-muted-foreground">{row.progress}% · {row.confidence}% conf.</span>
                            </div>
                        </div>
                    )}
                />
            </Section>
        </PageContainer>
    );
}
