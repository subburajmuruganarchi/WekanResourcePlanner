import { useState, useEffect } from 'react';
import { Users, FolderKanban, Clock, TrendingUp } from "lucide-react"
import { PageContainer } from "@/components/layout/page-container"
import { StatCard } from "./components/stat-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { AiInsightPanel } from "@/components/ai/ai-insight-panel"
import { useDashboardInsight } from "@/lib/use-ai-insights"
import { useNavigate } from "react-router-dom"
import { AllocationHeatmap, type HeatmapCell } from "@/components/dashboard/allocation-heatmap"
import { StaffingRiskCards, type StaffingRiskItem } from "@/components/dashboard/staffing-risk-cards"
import { api as apiClient } from "@/lib/api-client"

export default function Dashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { insight, loading: insightLoading, fetchInsight } = useDashboardInsight()
    const [heatmap, setHeatmap] = useState<{
        projects: { id: string; name: string; code: string }[];
        employees: { id: string; name: string; totalPercent: number }[];
        cells: HeatmapCell[];
    } | null>(null)
    const [heatmapLoading, setHeatmapLoading] = useState(true)
    const [staffingRisks, setStaffingRisks] = useState<StaffingRiskItem[]>([])
    const [risksLoading, setRisksLoading] = useState(true)

    const canSeeInsights = user?.role === 'Admin' || user?.role === 'Project Manager'

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                const result = response.data;

                if (result.status === 'success') {
                    const data = result.data;
                    setStats([
                        { label: "Active Projects", value: data.activeProjects.toString(), change: "Live from Platform", icon: FolderKanban, color: "blue" as const },
                        { label: "Total Employees", value: data.totalEmployees.toString(), change: "Live from Platform", icon: Users, color: "green" as const },
                        { label: "Avg Utilization", value: `${data.avgUtilization}%`, change: "Allocation-weighted", icon: TrendingUp, color: "purple" as const },
                        { label: "Hours This Week", value: data.hoursThisWeek.toLocaleString(), change: "Logged time entries", icon: Clock, color: "orange" as const },
                        { label: "Pending Approvals", value: data.pendingApprovals.toLocaleString(), change: "Submitted — awaiting PM", icon: Clock, color: "amber" as const },
                    ]);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                setStats([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        if (canSeeInsights) {
            fetchInsight();
            setHeatmapLoading(true);
            setRisksLoading(true);
            apiClient
                .get<{
                    projects: { id: string; name: string; code: string }[];
                    employees: { id: string; name: string; totalPercent: number }[];
                    cells: HeatmapCell[];
                }>('/dashboard/allocation-heatmap')
                .then((data) => setHeatmap(data))
                .catch(() => setHeatmap(null))
                .finally(() => setHeatmapLoading(false));
            apiClient
                .get<StaffingRiskItem[]>('/dashboard/staffing-risks')
                .then(setStaffingRisks)
                .catch(() => setStaffingRisks([]))
                .finally(() => setRisksLoading(false));
        } else {
            setHeatmapLoading(false);
            setRisksLoading(false);
        }
    }, [canSeeInsights, fetchInsight]);

    const utilizationPct = insight?.metrics?.avgUtilization ?? 0;

    return (
        <PageContainer className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {isLoading ? 'Loading metrics…' : 'Live resource management metrics'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/reports')}>Reports</Button>
                    <Button onClick={() => navigate('/projects')}>Projects</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {!isLoading ? stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                )) : (
                    [1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl" />
                    ))
                )}
            </div>

            {canSeeInsights && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card className="xl:col-span-2 p-6 border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Allocation heatmap</h3>
                        <AllocationHeatmap
                            projects={heatmap?.projects ?? []}
                            employees={heatmap?.employees ?? []}
                            cells={heatmap?.cells ?? []}
                            loading={heatmapLoading}
                        />
                    </Card>

                    <div className="space-y-6 min-w-0">
                        <Card className="p-6 border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Utilization</h3>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, utilizationPct)}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Avg allocation: {utilizationPct}%</p>
                        </Card>

                        <Card className="p-6 border-gray-200 min-w-0 overflow-hidden">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Staffing risk</h3>
                            <StaffingRiskCards risks={staffingRisks} loading={risksLoading} />
                        </Card>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Operational snapshot</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Active projects</p>
                            <p className="text-lg font-semibold">{insight?.metrics?.activeProjects ?? '—'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Pending approvals</p>
                            <p className="text-lg font-semibold">{insight?.metrics?.pendingApprovals ?? '—'}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Hours this week</p>
                            <p className="text-lg font-semibold">{insight?.metrics?.hoursThisWeek?.toLocaleString() ?? '—'}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Workforce signals</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        {(insight?.bullets ?? []).slice(0, 5).map((b, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="text-brand-500 shrink-0">•</span>
                                <span>{b}</span>
                            </li>
                        ))}
                    </ul>
                    {canSeeInsights && (
                        <Button variant="link" className="mt-4 px-0" onClick={() => navigate('/insights')}>
                            Insights Center
                        </Button>
                    )}
                </Card>
            </div>

            {canSeeInsights && (
                <AiInsightPanel
                    title="Workforce insights (read-only)"
                    narrative={insight?.narrative}
                    bullets={insight?.bullets}
                    loading={insightLoading}
                />
            )}
        </PageContainer>
    )
}
