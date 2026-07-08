import { useMemo, useEffect, useState, useCallback } from 'react';
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
import { useUtilizationVariance } from '@/lib/use-utilization';
import { api as apiClient } from '@/lib/api-client';
import {
    buildDashboardPeriodRange,
    getCurrentWeekStart,
    getCurrentMonthValue,
    periodQueryString,
} from '@/lib/dashboard-period';
import { buildWorkforceUtilizationTrend } from '@/lib/utilization-trend';
import { DeliveryPortfolioCharts } from '@/app/delivery/components/delivery-portfolio-charts';
import { ExecutiveDashboardCharts } from './components/executive-dashboard-charts';
import { UtilizationAnalytics } from '@/components/dashboard/UtilizationAnalytics';
import { EnterpriseHeatmap } from '@/components/dashboard/EnterpriseHeatmap';
import { RiskCardGrid } from '@/components/dashboard/RiskCard';
import type { HeatmapCell, HeatmapMeta } from '@/components/dashboard/allocation-heatmap';
import { fetchDeliveryRisks, type DeliveryRiskItem } from '@/lib/risk-intelligence';
import { DashboardPeriodFilters } from '@/app/dashboard/components/dashboard-period-filters';
import type { DashboardPeriodMode } from '@/lib/dashboard-period';

export default function ExecutiveDashboardPage() {
    const navigate = useNavigate();
    const { stats, portfolioRows, executiveRisks, loading } = useExecutiveMetrics();
    const { insight, loading: insightLoading, fetchInsight } = useDashboardInsight();
    const { data: utilizationData, loading: utilizationLoading, fetchVariance } = useUtilizationVariance();

    const [periodMode, setPeriodMode] = useState<DashboardPeriodMode>('week');
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
    const [heatmap, setHeatmap] = useState<{
        projects: { id: string; name: string; code: string }[];
        employees: { id: string; name: string; totalPercent: number }[];
        cells: HeatmapCell[];
        meta?: HeatmapMeta;
    } | null>(null);
    const [heatmapLoading, setHeatmapLoading] = useState(true);
    const [staffingRisks, setStaffingRisks] = useState<DeliveryRiskItem[]>([]);

    const periodRange = useMemo(
        () => buildDashboardPeriodRange(periodMode, selectedWeek, selectedMonth),
        [periodMode, selectedWeek, selectedMonth]
    );

    const periodQuery = useMemo(() => periodQueryString(periodRange), [periodRange]);

    const loadPeriodData = useCallback(async () => {
        setHeatmapLoading(true);
        void fetchInsight(periodRange);
        void fetchVariance({
            weekStartFrom: periodRange.weekStartFrom,
            weekStartTo: periodRange.weekStartTo,
        });
        try {
            const data = await apiClient.get<{
                projects: { id: string; name: string; code: string }[];
                employees: { id: string; name: string; totalPercent: number }[];
                cells: HeatmapCell[];
                meta?: HeatmapMeta;
            }>(`/dashboard/allocation-heatmap?${periodQuery}`);
            setHeatmap(data);
        } catch {
            setHeatmap(null);
        } finally {
            setHeatmapLoading(false);
        }
        fetchDeliveryRisks()
            .then(setStaffingRisks)
            .catch(() => setStaffingRisks([]));
    }, [fetchInsight, fetchVariance, periodQuery, periodRange]);

    useEffect(() => {
        void loadPeriodData();
    }, [loadPeriodData]);

    const sortedRows = useMemo(
        () =>
            [...portfolioRows].sort((a, b) => {
                const order = { Red: 0, Amber: 1, Green: 2 };
                return order[a.health] - order[b.health];
            }),
        [portfolioRows]
    );

    const portfolioColumns = portfolioTableColumns({ includeOwner: false });

    const utilizationTrend = useMemo(
        () => buildWorkforceUtilizationTrend(utilizationData?.rows ?? [], { maxWeeks: 12 }),
        [utilizationData]
    );

    const benchFromHeatmap = useMemo(() => {
        if (!heatmap?.employees.length) return stats?.benchCount ?? 0;
        return heatmap.employees.filter((e) => e.totalPercent < 20).length;
    }, [heatmap, stats]);

    const allocationDistribution = useMemo(() => {
        const billable = heatmap?.cells.filter((c) => c.percent > 0).length ?? 0;
        const bench = benchFromHeatmap;
        return [
            { name: 'Billable', value: Math.max(1, billable), color: '#4f46e5' },
            { name: 'Bench', value: bench || 1, color: '#94a3b8' },
            { name: 'Under 20%', value: Math.max(1, Math.round(bench * 0.5)), color: '#cbd5e1' },
        ];
    }, [heatmap, benchFromHeatmap]);

    const topRisks = useMemo(
        () => staffingRisks.filter((r) => r.level === 'HIGH' || r.level === 'MEDIUM').slice(0, 6),
        [staffingRisks]
    );

    return (
        <PageContainer className="space-y-8">
            <PageHeader
                eyebrow="Enterprise Command Center"
                title="Executive Dashboard"
                description="Organization-wide delivery health, workforce utilization, and portfolio risk — with trends and drill-down visuals."
            />

            <DashboardPeriodFilters
                mode={periodMode}
                weekStart={selectedWeek}
                monthValue={selectedMonth}
                range={periodRange}
                onModeChange={setPeriodMode}
                onWeekChange={setSelectedWeek}
                onMonthChange={setSelectedMonth}
            />

            {loading || !stats ? (
                <MetricGridSkeleton count={4} />
            ) : (
                <>
                    <Section title="Company delivery health" description="Active projects and delivery risk severity.">
                        <MetricGrid columns={{ sm: 2, xl: 4 }}>
                            <MetricCard label="Active projects" value={String(stats.activeProjects)} icon={FolderKanban} hint="In delivery" />
                            <MetricCard label="On track" value={String(stats.onTrack)} accent="emerald" icon={Activity} />
                            <MetricCard label="At risk" value={String(stats.atRisk)} accent="amber" icon={AlertTriangle} />
                            <MetricCard label="Critical" value={String(stats.critical)} accent="rose" icon={AlertTriangle} />
                        </MetricGrid>
                    </Section>

                    <Section title="Workforce & capacity" description="Headcount, utilization, and bench availability.">
                        <MetricGrid columns={{ sm: 2, xl: 4 }}>
                            <MetricCard label="Total workforce" value={String(stats.totalEmployees)} icon={Users} accent="sky" />
                            <MetricCard label="Utilization" value={`${stats.utilization}%`} icon={Gauge} hint="Target band ~80–90%" />
                            <MetricCard label="Bench capacity" value={String(benchFromHeatmap)} accent="slate" hint="Below 20% allocated" />
                            <MetricCard
                                label="Hiring risk"
                                value={stats.hiringRisk}
                                accent={stats.hiringRisk === 'High' ? 'rose' : 'amber'}
                            />
                        </MetricGrid>
                    </Section>

                    <div className="dashboard-card p-6 bg-gradient-to-br from-brand-500/10 to-card border-brand-500/20">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                                    Delivery confidence score
                                </p>
                                <p className="text-4xl font-bold text-card-foreground mt-2">{stats.deliveryConfidence}%</p>
                                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                                    Weighted blend of plan delivery ({stats.planDeliveryPercent}%), open risks, and
                                    utilization for the selected period.
                                </p>
                            </div>
                            <Target className="w-12 h-12 text-brand-500 opacity-80 hidden md:block" aria-hidden />
                        </div>
                    </div>

                    <Section title="Executive visuals" description="Charts summarizing portfolio and workforce posture.">
                        <ExecutiveDashboardCharts stats={stats} utilization={utilizationData} />
                    </Section>

                    <Section title="Utilization trend" description="Planned vs logged hours week over week.">
                        <UtilizationAnalytics
                            trendData={utilizationTrend}
                            distribution={allocationDistribution}
                            loading={utilizationLoading || heatmapLoading}
                        />
                    </Section>

                    <Section
                        title="Allocation heatmap"
                        description="Who is on which project — peak allocation % for the period."
                        action={
                            <Button variant="outline" size="sm" onClick={() => navigate('/allocation')}>
                                Open resource planning
                            </Button>
                        }
                    >
                        <EnterpriseHeatmap
                            projects={heatmap?.projects ?? []}
                            employees={heatmap?.employees ?? []}
                            cells={heatmap?.cells ?? []}
                            meta={heatmap?.meta}
                            loading={heatmapLoading}
                        />
                    </Section>

                    {!insightLoading && insight?.narrative && (
                        <div className="dashboard-card p-6 border-brand-500/20">
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI executive brief
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

                    <Section title="Portfolio progress" description="Health distribution and confidence by project.">
                        <DeliveryPortfolioCharts rows={portfolioRows} />
                    </Section>

                    {topRisks.length > 0 && (
                        <Section
                            title="Priority delivery risks"
                            description="Projects needing executive attention"
                            action={
                                <Button variant="outline" size="sm" onClick={() => navigate('/executive/risk-radar')}>
                                    Risk radar
                                </Button>
                            }
                        >
                            <RiskCardGrid risks={topRisks} onView={(id) => navigate(`/projects/${id}`)} />
                        </Section>
                    )}
                </>
            )}

            <Section
                title="Portfolio at a glance"
                description="All active projects sorted by risk"
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
                        All projects
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
                                <span className="text-xs text-muted-foreground">
                                    {row.progress}% · {row.confidence}% conf.
                                </span>
                            </div>
                        </div>
                    )}
                />
            </Section>

            {executiveRisks.length > 0 && (
                <Section title="Risk watchlist" description="Top signals from planner and allocation data.">
                    <ul className="grid gap-3 md:grid-cols-2">
                        {executiveRisks.slice(0, 4).map((r) => (
                            <li key={r.id} className="dashboard-card p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-card-foreground text-sm">{r.title}</p>
                                    <StatusBadge variant={r.impact === 'High' ? 'critical' : r.impact === 'Medium' ? 'warning' : 'neutral'}>
                                        {r.impact}
                                    </StatusBadge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{r.reason}</p>
                                {r.projectName && (
                                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">{r.projectName}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </PageContainer>
    );
}
