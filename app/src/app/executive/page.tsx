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
import { DeliveryPortfolioCharts } from '@/app/delivery/components/delivery-portfolio-charts';

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
                eyebrow="Enterprise Command Center"
                title="Enterprise Dashboard"
                description="One organization-wide view of delivery health and workforce capacity. Every number below has a short explanation so any role — CEO, Delivery Manager, Project Manager, or team member — can read it at a glance. This is a read-only decision view; drill into Projects or Resource Planning to make changes."
            />

            {loading || !stats ? (
                <KPIGridSkeleton />
            ) : (
                <>
                    <WorkspaceSection title="Company Delivery Health" description="How many projects are running and how many need attention right now.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <WorkspaceMetricCard label="Active Projects" value={String(stats.activeProjects)} icon={FolderKanban} hint="Projects currently in delivery (status Active)." />
                            <WorkspaceMetricCard label="On Track" value={String(stats.onTrack)} accent="emerald" icon={Activity} hint="No open delivery risk detected — progressing as planned." />
                            <WorkspaceMetricCard label="At Risk" value={String(stats.atRisk)} accent="amber" icon={AlertTriangle} hint="Medium-severity risks — watch capacity or allocation gaps." />
                            <WorkspaceMetricCard label="Critical" value={String(stats.critical)} accent="rose" icon={AlertTriangle} hint="High-severity risks — needs action this week." />
                        </div>
                    </WorkspaceSection>

                    <WorkspaceSection title="Resource Health" description="Whether the workforce is fully used, over-stretched, or has spare capacity.">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <WorkspaceMetricCard label="Total Workforce" value={String(stats.totalEmployees)} icon={Users} accent="sky" hint="Active employees available for staffing." />
                            <WorkspaceMetricCard label="Utilization" value={`${stats.utilization}%`} icon={Gauge} hint="Share of capacity that is allocated to projects. ~80–90% is healthy." />
                            <WorkspaceMetricCard label="Bench Capacity" value={String(stats.benchCount)} accent="slate" hint="People with spare capacity who can take on new work." />
                            <WorkspaceMetricCard label="Hiring Risk" value={stats.hiringRisk} accent={stats.hiringRisk === 'High' ? 'rose' : 'amber'} hint="Likelihood you'll need to hire soon based on bench vs. demand." />
                        </div>
                    </WorkspaceSection>

                    <div className="dashboard-card p-6 bg-gradient-to-br from-brand-50/80 to-white border-brand-100">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Delivery Confidence Score</p>
                                <p className="text-4xl font-bold text-slate-900 mt-2">{stats.deliveryConfidence}%</p>
                                <p className="text-sm text-slate-600 mt-2 max-w-xl">
                                    A single 0–100 health score. Higher is better. It blends plan delivery ({stats.planDeliveryPercent}%),
                                    current delivery risk, and workforce utilization. Use it as a quick pulse — the sections below explain what's driving it.
                                </p>
                            </div>
                            <Target className="w-12 h-12 text-brand-500 opacity-80 hidden md:block" />
                        </div>
                    </div>

                    <WorkspaceSection
                        title="Portfolio trends"
                        description="How your active projects are distributed by health, and where progress vs. confidence diverge."
                    >
                        <DeliveryPortfolioCharts rows={portfolioRows} />
                    </WorkspaceSection>

                    <div className="dashboard-card p-5 bg-slate-50/60">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">How to read this dashboard</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-600">
                            <div className="flex items-start gap-2">
                                <HealthBadge health="Green" />
                                <span>On track — no action needed.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <HealthBadge health="Amber" />
                                <span>At risk — review capacity and allocation soon.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <HealthBadge health="Red" />
                                <span>Critical — needs attention this week.</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                            <strong>Progress</strong> is how far a project has advanced. <strong>Confidence</strong> is how likely it is to finish on plan.
                            When progress is high but confidence is low, the project is drifting off plan and worth a closer look.
                        </p>
                    </div>
                </>
            )}

            <WorkspaceSection
                title="Portfolio at a glance"
                description="Top projects by current delivery risk (allocation + planner)"
                action={
                    <Button variant="outline" size="sm" onClick={() => navigate('/executive/risk-radar')}>
                        View risks
                    </Button>
                }
            >
                <div className="dashboard-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b bg-slate-50/80">
                                    <th className="px-4 py-3">Project</th>
                                    <th className="px-4 py-3">Health</th>
                                    <th className="px-4 py-3">Progress</th>
                                    <th className="px-4 py-3">Confidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0, 6).map((row) => (
                                    <tr key={row.projectId} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{row.projectName}</td>
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
