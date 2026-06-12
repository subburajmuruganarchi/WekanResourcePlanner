import { useState, useEffect, useMemo } from 'react';
import {
    Users,
    FolderKanban,
    TrendingUp,
    Target,
    CheckCircle2,
    ClipboardList,
    AlertCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { StatCard } from './components/stat-card';
import { DashboardPeriodFilters } from './components/dashboard-period-filters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AiInsightPanel } from '@/components/ai/ai-insight-panel';
import { useDashboardInsight } from '@/lib/use-ai-insights';
import { useNavigate } from 'react-router-dom';
import { AllocationHeatmap, type HeatmapCell } from '@/components/dashboard/allocation-heatmap';
import { StaffingRiskCards, type StaffingRiskItem } from '@/components/dashboard/staffing-risk-cards';
import {
    PlannedVsActualPanel,
    type PlannedVsActualProjectPoint,
} from '@/components/dashboard/planned-vs-actual-panel';
import { useUtilizationVariance } from '@/lib/use-utilization';
import type { UtilizationDashboardSummary } from '@/types/utilization';
import { api as apiClient } from '@/lib/api-client';
import {
    buildDashboardPeriodRange,
    formatDashboardPeriodLabel,
    getCurrentMonthValue,
    getCurrentWeekStart,
    periodQueryString,
    type DashboardPeriodMode,
} from '@/lib/dashboard-period';

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
    } | null>(null);
    const [heatmapLoading, setHeatmapLoading] = useState(true);
    const [staffingRisks, setStaffingRisks] = useState<StaffingRiskItem[]>([]);
    const [risksLoading, setRisksLoading] = useState(true);

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
    const canSeeInsights = user?.role === 'Admin' || user?.role === 'Project Manager';

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
            setRisksLoading(true);
            apiClient
                .get<{
                    projects: { id: string; name: string; code: string }[];
                    employees: { id: string; name: string; totalPercent: number }[];
                    cells: HeatmapCell[];
                }>(`/dashboard/allocation-heatmap?${periodQuery}`)
                .then((data) => setHeatmap(data))
                .catch(() => setHeatmap(null))
                .finally(() => setHeatmapLoading(false));
            apiClient
                .get<StaffingRiskItem[]>('/dashboard/staffing-risks')
                .then(setStaffingRisks)
                .catch(() => setStaffingRisks([]))
                .finally(() => setRisksLoading(false));
            void fetchVariance(periodRange);
        } else {
            setHeatmapLoading(false);
            setRisksLoading(false);
        }
    }, [canSeeInsights, fetchInsight, periodQuery, periodRange, fetchVariance]);

    const plannedVsActualByProject: PlannedVsActualProjectPoint[] = useMemo(() => {
        const rows = utilizationData?.rows ?? [];
        const byProject = new Map<string, { projectName: string; planned: number; actual: number }>();
        for (const r of rows) {
            const cur = byProject.get(r.projectId) ?? {
                projectName: r.projectName ?? r.projectCode ?? 'Project',
                planned: 0,
                actual: 0,
            };
            cur.planned += r.plannedHours;
            cur.actual += r.actualHours;
            byProject.set(r.projectId, cur);
        }
        return [...byProject.entries()]
            .sort(([, a], [, b]) => b.planned - a.planned)
            .map(([projectId, v]) => ({
                projectId,
                projectName: v.projectName,
                plannedHours: v.planned,
                actualHours: v.actual,
            }));
    }, [utilizationData]);

    const utilizationPanelSummary = useMemo((): UtilizationDashboardSummary | null => {
        const v = utilizationData;
        if (!v) return null;

        const employeeWeeks = new Map<string, { actual: number }>();
        for (const r of v.rows) {
            const key = `${r.employeeId}|${r.weekStart}`;
            const cur = employeeWeeks.get(key) ?? { actual: 0 };
            cur.actual += r.actualHours;
            employeeWeeks.set(key, cur);
        }

        const weeklyCapacityHours = 40;
        let utilSum = 0;
        for (const { actual } of employeeWeeks.values()) {
            utilSum += Math.min(100, Math.round((actual / weeklyCapacityHours) * 10000) / 100);
        }

        const { totalPlannedHours, totalActualHours, avgVariancePercent } = v.summary;

        return {
            weekStart: v.weekStartFrom,
            totalPlannedHours,
            totalActualHours,
            planVarianceHours: Math.round((totalPlannedHours - totalActualHours) * 10) / 10,
            avgActualUtilizationPercent:
                employeeWeeks.size > 0
                    ? Math.round((utilSum / employeeWeeks.size) * 100) / 100
                    : 0,
            avgVariancePercent,
            overrunProjects: v.overrunProjects.map((p) => ({
                projectId: p.projectId,
                projectName: p.projectName ?? p.projectCode ?? 'Project',
                overrunHours: p.overrunHours,
            })),
        };
    }, [utilizationData]);

    const showEmptyPeriodHint =
        stats &&
        stats.plannedHours > 0 &&
        stats.approvedHours === 0 &&
        stats.hoursThisWeek === 0;

    const statCards = stats
        ? [
              {
                  label: 'Active Projects',
                  value: stats.activeProjects.toString(),
                  change: 'Currently active on platform',
                  icon: FolderKanban,
                  color: 'blue' as const,
              },
              {
                  label: 'Team Size',
                  value: stats.totalEmployees.toString(),
                  change: 'Active employees',
                  icon: Users,
                  color: 'green' as const,
              },
              {
                  label: 'Planned Hours',
                  value: `${Math.round(stats.plannedHours).toLocaleString()}h`,
                  change: `Weekly planner · ${periodLabel}`,
                  icon: Target,
                  color: 'purple' as const,
                  highlight: true,
              },
              {
                  label: 'Actual Hours',
                  value: `${Math.round(stats.approvedHours).toLocaleString()}h`,
                  change: 'Approved & logged time',
                  icon: CheckCircle2,
                  color: 'brand' as const,
                  highlight: true,
              },
              {
                  label: 'Plan Delivery',
                  value: `${stats.planDeliveryPercent}%`,
                  change: `Allocation util. ${stats.avgUtilization}%`,
                  icon: TrendingUp,
                  color: stats.planDeliveryPercent >= 50 ? ('green' as const) : ('amber' as const),
              },
              {
                  label: 'Pending Approvals',
                  value: stats.pendingApprovals.toString(),
                  change: 'Open timesheets (all periods)',
                  icon: ClipboardList,
                  color: stats.pendingApprovals > 0 ? ('amber' as const) : ('orange' as const),
              },
          ]
        : [];

    return (
        <PageContainer className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {isLoading ? 'Loading metrics…' : `Resource overview · ${periodLabel}`}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={() => navigate('/weekly-planner')}>
                        Weekly Planner
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/reports')}>
                        Reports
                    </Button>
                    <Button onClick={() => navigate('/pm-approvals')}>Approvals</Button>
                </div>
            </div>

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

            {showEmptyPeriodHint && (
                <Card className="p-4 border-amber-200 bg-amber-50/60 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-900">Planned work exists, no logged actuals yet</p>
                        <p className="text-sm text-amber-800 mt-1">
                            This period has {Math.round(stats.plannedHours).toLocaleString()}h planned but no
                            approved time entries. Use <strong>This week</strong> for live demo data, or log and
                            approve time in Time Entry / PM Approvals.
                        </p>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
                {!isLoading && stats
                    ? statCards.map((stat) => <StatCard key={stat.label} {...stat} />)
                    : [1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                      ))}
            </div>

            {canSeeInsights && (
                <PlannedVsActualPanel
                    summary={utilizationPanelSummary}
                    projectSeries={plannedVsActualByProject}
                    rangeLabel={periodLabel}
                    loading={utilizationLoading}
                />
            )}

            {canSeeInsights && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card className="xl:col-span-2 p-6 border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Allocation heatmap</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Who is on which project · {periodLabel}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/allocation')}>
                                Open allocation
                            </Button>
                        </div>
                        <AllocationHeatmap
                            projects={heatmap?.projects ?? []}
                            employees={heatmap?.employees ?? []}
                            cells={heatmap?.cells ?? []}
                            loading={heatmapLoading}
                        />
                    </Card>

                    <Card className="p-6 border-gray-200 min-w-0 overflow-hidden">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Staffing risk</h3>
                        <p className="text-xs text-gray-500 mb-4">Projects needing attention</p>
                        <StaffingRiskCards risks={staffingRisks} loading={risksLoading} />
                    </Card>
                </div>
            )}

            {canSeeInsights && (
                <div className="space-y-3">
                    <AiInsightPanel
                        title="Workforce insights"
                        narrative={insight?.narrative}
                        bullets={insight?.bullets}
                        loading={insightLoading}
                    />
                    <div className="flex flex-wrap gap-3">
                        <Button variant="link" className="px-0" onClick={() => navigate('/insights')}>
                            Open Insights Center
                        </Button>
                        <Button variant="link" className="px-0" onClick={() => navigate('/time-entry')}>
                            Time Entry
                        </Button>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
