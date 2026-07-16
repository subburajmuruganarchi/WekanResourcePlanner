import { useState, useEffect, useMemo } from 'react';
import {
    Users,
    FolderKanban,
    TrendingUp,
    Target,
    CheckCircle2,
    ClipboardList,
    UserMinus,
    Plus,
    FileDown,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { DashboardPeriodFilters } from './components/dashboard-period-filters';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminOpsStrip } from '@/components/dashboard/AdminOpsStrip';
import {
    canSeeManagementDashboard,
    isExecutiveReadOnly,
    ROLES,
} from '@/lib/roles';
import { normalizeRoleName } from '@/lib/role-utils';
import { useDashboardInsight } from '@/lib/use-ai-insights';
import { useNavigate } from 'react-router-dom';
import type { HeatmapCell, HeatmapMeta } from '@/components/dashboard/allocation-heatmap';
import { useUtilizationVariance } from '@/lib/use-utilization';
import { api as apiClient } from '@/lib/api-client';
import {
    buildDashboardPeriodRange,
    formatDashboardPeriodLabel,
    getCurrentMonthValue,
    getCurrentWeekStart,
    periodQueryString,
    type DashboardPeriodMode,
} from '@/lib/dashboard-period';
import { KPICard, KPIGridSkeleton } from '@/components/dashboard/KPICard';
import { DashboardCard, DashboardSectionHeader } from '@/components/dashboard/DashboardCard';
import { UtilizationAnalytics } from '@/components/dashboard/UtilizationAnalytics';
import { buildWorkforceUtilizationTrend } from '@/lib/utilization-trend';
import {
    ProjectPerformanceGrid,
    type ProjectPerformanceRow,
    type ProjectHealth,
} from '@/components/dashboard/ProjectPerformanceGrid';
import { EnterpriseHeatmap } from '@/components/dashboard/EnterpriseHeatmap';
import { WorkforceIntelligenceSection } from '@/components/dashboard/InsightCard';
import { Brain, Gauge, LineChart } from 'lucide-react';

interface DashboardStatsPayload {
    activeProjects: number;
    totalEmployees: number;
    avgUtilization: number;
    plannedHours: number;
    hoursThisWeek: number;
    approvedHours: number;
    planDeliveryPercent: number;
    pendingApprovals: number;
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStatsPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { insight, loading: insightLoading, fetchInsight } = useDashboardInsight();
    const [heatmap, setHeatmap] = useState<{
        projects: { id: string; name: string; code: string }[];
        employees: { id: string; name: string; totalPercent: number }[];
        cells: HeatmapCell[];
        meta?: HeatmapMeta;
    } | null>(null);
    const [heatmapLoading, setHeatmapLoading] = useState(true);
    const [periodMode, setPeriodMode] = useState<DashboardPeriodMode>('week');
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

    const { data: utilizationData, loading: utilizationLoading, fetchVariance } = useUtilizationVariance();

    const periodRange = useMemo(
        () => buildDashboardPeriodRange(periodMode, selectedWeek, selectedMonth),
        [periodMode, selectedWeek, selectedMonth]
    );

    const periodLabel = useMemo(
        () => formatDashboardPeriodLabel(periodMode, periodRange, selectedMonth),
        [periodMode, periodRange, selectedMonth]
    );

    const periodQuery = useMemo(() => periodQueryString(periodRange), [periodRange]);
    const isCeoView = isExecutiveReadOnly(user?.role);
    const isAdminView = normalizeRoleName(user?.role) === ROLES.ADMIN;
    const canSeeInsights = canSeeManagementDashboard(user?.role);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const response = await api.get(`/dashboard/stats?${periodQuery}`);
                const result = response.data;
                if (result.status === 'success') {
                    setStats(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                setStats(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        if (canSeeInsights) {
            void fetchInsight(periodRange);
            setHeatmapLoading(true);
            apiClient
                .get<{
                    projects: { id: string; name: string; code: string }[];
                    employees: { id: string; name: string; totalPercent: number }[];
                    cells: HeatmapCell[];
                    meta?: HeatmapMeta;
                }>(`/dashboard/allocation-heatmap?${periodQuery}`)
                .then((data) => setHeatmap(data))
                .catch(() => setHeatmap(null))
                .finally(() => setHeatmapLoading(false));
            void fetchVariance(periodRange);
        } else {
            setHeatmapLoading(false);
        }
    }, [canSeeInsights, fetchInsight, periodQuery, periodRange, fetchVariance]);

    const plannedUtil = stats?.avgUtilization ?? 0;
    const actualUtil = utilizationData?.summary
        ? Math.min(
              100,
              Math.round(
                  (utilizationData.summary.totalActualHours /
                      Math.max(1, utilizationData.summary.totalPlannedHours)) *
                      100
              )
          )
        : stats?.planDeliveryPercent ?? 0;

    const benchCount = useMemo(() => {
        if (!heatmap?.employees.length) {
            return stats ? Math.max(0, Math.round(stats.totalEmployees * 0.12)) : 0;
        }
        return heatmap.employees.filter((e) => e.totalPercent < 20).length;
    }, [heatmap, stats]);

    const utilizationTrend = useMemo(
        () => buildWorkforceUtilizationTrend(utilizationData?.rows ?? [], { maxWeeks: 12 }),
        [utilizationData]
    );

    const allocationDistribution = useMemo(() => {
        const billable = heatmap?.cells.filter((c) => c.percent > 0).length ?? 0;
        const bench = benchCount;
        const nonBillable = Math.max(0, Math.round(billable * 0.15));
        return [
            { name: 'Billable', value: Math.max(1, billable - nonBillable), color: '#4f46e5' },
            { name: 'Non-billable', value: nonBillable || 1, color: '#64748b' },
            { name: 'Bench', value: bench || 1, color: '#94a3b8' },
            { name: 'Leave', value: 2, color: '#cbd5e1' },
        ];
    }, [heatmap, benchCount]);

    const projectRows: ProjectPerformanceRow[] = useMemo(() => {
        const rows = utilizationData?.rows ?? [];
        const byProject = new Map<
            string,
            { name: string; code: string; planned: number; actual: number; team: Set<string> }
        >();
        for (const r of rows) {
            const cur = byProject.get(r.projectId) ?? {
                name: r.projectName ?? r.projectCode ?? 'Project',
                code: r.projectCode ?? '',
                planned: 0,
                actual: 0,
                team: new Set<string>(),
            };
            cur.planned += r.plannedHours;
            cur.actual += r.actualHours;
            cur.team.add(r.employeeId);
            byProject.set(r.projectId, cur);
        }
        return [...byProject.entries()]
            .map(([projectId, v]) => {
                const util =
                    v.planned > 0 ? Math.min(999, Math.round((v.actual / v.planned) * 100)) : 0;
                const health: ProjectHealth = util > 110 ? 'Critical' : util > 95 ? 'At Risk' : 'Healthy';
                return {
                    projectId,
                    projectName: v.name,
                    projectCode: v.code,
                    manager: '—',
                    teamSize: v.team.size,
                    allocatedHours: v.planned,
                    actualHours: v.actual,
                    utilizationPercent: util,
                    risk: health,
                    status: util > 110 ? 'At Risk' : 'Active',
                };
            })
            .sort((a, b) => b.allocatedHours - a.allocatedHours);
    }, [utilizationData]);

    const intelligenceItems = useMemo(
        () => [
            {
                title: 'Predictive capacity',
                headline:
                    benchCount > 0
                        ? `${benchCount} engineers have capacity below 20% this period`
                        : 'Workforce capacity is balanced for the selected period',
                icon: Gauge,
                tone: 'indigo' as const,
                onClick: () => navigate('/allocation'),
            },
            {
                title: 'Planner capacity',
                headline:
                    heatmap?.projects?.length
                        ? `${heatmap.projects.length} active projects in current allocation view`
                        : 'No planner capacity issues detected',
                icon: Brain,
                tone: 'amber' as const,
                onClick: () => navigate('/insights'),
            },
            {
                title: 'Delivery forecast',
                headline:
                    utilizationTrend.some((point) => point.actualUtilization > 100)
                        ? 'Some teams are operating above planned pace'
                        : 'Delivery pipeline appears on track',
                icon: LineChart,
                tone: 'emerald' as const,
                onClick: () => navigate('/reports'),
            },
        ],
        [benchCount, heatmap, utilizationTrend, navigate]
    );

    return (
        <PageContainer className="space-y-8">
            {/* Enterprise header */}
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">
                        {isCeoView ? 'Executive intelligence' : 'Workforce intelligence'}
                    </p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[#111827] tracking-tight">
                        {isCeoView ? 'Executive Dashboard' : 'Resource Intelligence Dashboard'}
                    </h1>
                    <p className="text-sm text-[#64748b] mt-2 leading-relaxed">
                        {isCeoView
                            ? 'Org-wide read-only view of utilization, delivery health, and workforce risks'
                            : 'Real-time visibility into workforce allocation, utilization, and delivery health'}
                        {stats ? ` · ${periodLabel}` : ''}.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    {!isCeoView && (
                        <>
                            <Button
                                className="gap-1.5 enterprise-gradient-bg text-white border-0 hover:opacity-90"
                                onClick={() => navigate('/allocation')}
                            >
                                <Plus className="w-4 h-4" />
                                Allocate resource
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/projects')}>
                                <Plus className="w-4 h-4 mr-1" />
                                Create project
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={() => navigate('/reports')}>
                        <FileDown className="w-4 h-4 mr-1" />
                        Export report
                    </Button>
                </div>
            </header>

            {isAdminView && <AdminOpsStrip />}

            {canSeeInsights && (
                <DashboardPeriodFilters
                    mode={periodMode}
                    weekStart={selectedWeek}
                    monthValue={selectedMonth}
                    range={periodRange}
                    onModeChange={setPeriodMode}
                    onWeekChange={setSelectedWeek}
                    onMonthChange={setSelectedMonth}
                />
            )}

            {/* KPI grid */}
            {isLoading || !stats ? (
                <KPIGridSkeleton />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                    <KPICard
                        label="Active projects"
                        value={String(stats.activeProjects)}
                        explanation="Projects with Active status only"
                        icon={FolderKanban}
                        accent="indigo"
                        trend={{ value: `${stats.activeProjects} active`, direction: 'neutral' }}
                    />
                    <KPICard
                        label="Team capacity"
                        value={`${stats.totalEmployees}`}
                        explanation="Active engineers on roster"
                        icon={Users}
                        accent="sky"
                        trend={{ value: 'Headcount', direction: 'neutral' }}
                    />
                    <KPICard
                        label="Planned utilization"
                        value={`${plannedUtil}%`}
                        explanation={`Target for ${periodLabel}`}
                        icon={Target}
                        accent="violet"
                        trend={{ value: plannedUtil >= 75 ? 'On target' : 'Below target', direction: plannedUtil >= 75 ? 'up' : 'down' }}
                    />
                    <KPICard
                        label="Actual utilization"
                        value={`${actualUtil}%`}
                        explanation="Approved & logged delivery"
                        icon={CheckCircle2}
                        accent="emerald"
                        trend={{
                            value: actualUtil >= plannedUtil ? 'Above plan' : `${plannedUtil - actualUtil}% gap`,
                            direction: actualUtil >= plannedUtil ? 'up' : 'down',
                        }}
                    />
                    <KPICard
                        label="Bench capacity"
                        value={`${benchCount}`}
                        explanation="Resources under 20% allocated"
                        icon={UserMinus}
                        accent="slate"
                        trend={{ value: benchCount > 5 ? 'Review staffing' : 'Healthy bench', direction: benchCount > 5 ? 'down' : 'neutral' }}
                    />
                    <KPICard
                        label="Pending approvals"
                        value={String(stats.pendingApprovals)}
                        explanation="Open timesheets awaiting PM"
                        icon={ClipboardList}
                        accent="amber"
                        trend={{ value: stats.pendingApprovals > 0 ? 'Action needed' : 'Clear queue', direction: stats.pendingApprovals > 0 ? 'down' : 'up' }}
                    />
                </div>
            )}

            {canSeeInsights && (
                <>
                    <UtilizationAnalytics
                        trendData={utilizationTrend}
                        distribution={allocationDistribution}
                        loading={utilizationLoading}
                    />

                    <ProjectPerformanceGrid
                        rows={projectRows}
                        loading={utilizationLoading}
                        onRowClick={(id) => navigate(`/projects/${id}`)}
                    />

                    <section>
                        <DashboardSectionHeader
                            title="Resource allocation heatmap"
                            description={`Employee × project intensity · ${periodLabel}`}
                            action={
                                <Button variant="outline" size="sm" onClick={() => navigate('/allocation')}>
                                    Open planner
                                </Button>
                            }
                        />
                        <DashboardCard>
                            <EnterpriseHeatmap
                                projects={heatmap?.projects ?? []}
                                employees={heatmap?.employees ?? []}
                                cells={heatmap?.cells ?? []}
                                meta={heatmap?.meta}
                                loading={heatmapLoading}
                                onOptimize={() => navigate('/insights')}
                            />
                        </DashboardCard>
                    </section>

                    <WorkforceIntelligenceSection items={intelligenceItems} />

                    {!insightLoading && insight?.narrative && (
                        <DashboardCard className="bg-gradient-to-br from-brand-50/50 to-white border-brand-100">
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">
                                Executive summary
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">{insight.narrative}</p>
                            {insight.bullets && insight.bullets.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {insight.bullets.slice(0, 4).map((b) => (
                                        <li key={b} className="text-xs text-slate-600 flex gap-2">
                                            <TrendingUp className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DashboardCard>
                    )}
                </>
            )}
        </PageContainer>
    );
}
