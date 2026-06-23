import { Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspaceMetricCard, WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useCapacityForecast } from '@/lib/use-executive-metrics';
import { useDeliveryCommandMetrics } from '@/lib/use-delivery-metrics';

export default function DeliveryCapacityPage() {
    const { available, committed, gap, recommendation, loading } = useCapacityForecast();
    const { portfolioProjects, risks } = useDeliveryCommandMetrics();

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="Capacity Forecast"
                description="Portfolio capacity outlook and delivery confidence signals."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <WorkspaceMetricCard label="Available" value={loading ? '—' : String(available)} accent="emerald" />
                <WorkspaceMetricCard label="Committed" value={loading ? '—' : String(committed)} />
                <WorkspaceMetricCard label="Gap" value={loading ? '—' : String(gap)} accent={gap > 0 ? 'rose' : 'emerald'} />
            </div>

            <WorkspaceSection title="Delivery confidence by project">
                <div className="space-y-3">
                    {portfolioProjects.slice(0, 8).map((p) => {
                        const risk = risks.find((r) => r.projectId === p.id);
                        const confidence = risk ? Math.max(45, 100 - risk.score) : 85;
                        return (
                            <div key={p.id} className="dashboard-card p-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-slate-900">{p.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {risk?.reasons?.[0] ?? 'No delivery risk identified'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-brand-600">{confidence}%</p>
                                    <p className="text-xs text-slate-500">confidence</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </WorkspaceSection>

            <div className="dashboard-card p-5 flex gap-3">
                <Sparkles className="w-5 h-5 text-brand-600 shrink-0" />
                <p className="text-sm text-slate-700">{recommendation}</p>
            </div>
        </PageContainer>
    );
}
