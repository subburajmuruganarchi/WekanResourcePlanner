import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    FolderKanban,
    Users,
    Gauge,
    Target,
    AlertTriangle,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
    WorkspaceMetricCard,
    WorkspacePageHeader,
    WorkspaceSection,
    HealthBadge,
} from '@/components/workspaces/shared';
import { useExecutiveMetrics } from '@/lib/use-executive-metrics';
import { KPIGridSkeleton } from '@/components/dashboard/KPICard';

export default function ExecutiveDashboardPage() {
    const navigate = useNavigate();
    const { stats, portfolioRows, loading } = useExecutiveMetrics();

    const filtered = useMemo(() => {
        return [...portfolioRows].sort((a, b) => {
            const order = { Red: 0, Amber: 1, Green: 2 };
            return order[a.health] - order[b.health];
        });
    }, [portfolioRows]);

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
                eyebrow="Executive Command Center"
                title="Executive Dashboard"
                description="Organization-wide delivery and workforce intelligence — read-only decision view."
                action={
                    <Button variant="outline" onClick={() => navigate('/executive/brief')}>
                        AI Executive Brief
                    </Button>
                }
            />

            {loading || !stats ? (
                <KPIGridSkeleton />
            ) : (
                <>
                    <WorkspaceSection title="Company Delivery Health" description="Portfolio execution snapshot">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <WorkspaceMetricCard label="Active Projects" value={String(stats.activeProjects)} icon={FolderKanban} />
                            <WorkspaceMetricCard label="On Track" value={String(stats.onTrack)} accent="emerald" icon={Activity} />
                            <WorkspaceMetricCard label="At Risk" value={String(stats.atRisk)} accent="amber" icon={AlertTriangle} />
                            <WorkspaceMetricCard label="Critical" value={String(stats.critical)} accent="rose" icon={AlertTriangle} />
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection title="Resource Health">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <WorkspaceMetricCard label="Total Workforce" value={String(stats.totalEmployees)} icon={Users} accent="sky" />
                            <WorkspaceMetricCard label="Utilization" value={`${stats.utilization}%`} icon={Gauge} />
                            <WorkspaceMetricCard label="Bench Capacity" value={String(stats.benchCount)} accent="slate" />
                            <WorkspaceMetricCard label="Hiring Risk" value={stats.hiringRisk} accent={stats.hiringRisk === 'High' ? 'rose' : 'amber'} />
                        </div>
                    </WorkspaceSection>

                    <div className="dashboard-card p-6 bg-gradient-to-br from-brand-50/80 to-white border-brand-100">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Delivery Confidence Score</p>
                                <p className="text-4xl font-bold text-slate-900 mt-2">{stats.deliveryConfidence}%</p>
                                <p className="text-sm text-slate-600 mt-2 max-w-xl">
                                    Based on project progress, resource availability, staffing risks, and plan delivery ({stats.planDeliveryPercent}%).
                                </p>
                            </div>
                            <Target className="w-12 h-12 text-brand-500 opacity-80 hidden md:block" />
                        </div>
                    </div>
                </>
            )}

            <WorkspaceSection
                title="Portfolio at a glance"
                description="Top projects by delivery risk"
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate('/executive/portfolio-health')}>
                        View all
                    </Button>
                }
            >
                <div className="dashboard-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b bg-slate-50/80">
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Health</th>
                                    <th className="px-4 py-3">Progress</th>
                                    <th className="px-4 py-3">Confidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0, 6).map((row) => (
                                    <tr key={row.projectId} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{row.customer}</td>
                                        <td className="px-4 py-3 text-slate-600">{row.projectName}</td>
                                        <td className="px-4 py-3"><HealthBadge health={row.health} /></td>
                                        <td className="px-4 py-3">{row.progress}%</td>
                                        <td className="px-4 py-3 font-medium">{row.confidence}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
