import { ArrowRightLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useDeliveryCommandMetrics } from '@/lib/use-delivery-metrics';

export default function DeliveryRecommendationsPage() {
    const { recommendations, risks, loading } = useDeliveryCommandMetrics();

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="AI Recommendations"
                description="Resource optimization suggestions to reduce portfolio delivery risk."
            />

            <WorkspaceSection title="Resource moves">
                {loading ? (
                    <p className="text-sm text-slate-500">Analyzing portfolio…</p>
                ) : (
                    <div className="space-y-4">
                        {recommendations.map((rec) => (
                            <div key={rec.id} className="dashboard-card p-5">
                                <div className="flex items-center gap-2 text-indigo-600 mb-3">
                                    <ArrowRightLeft className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Recommendation</span>
                                </div>
                                <p className="text-sm text-slate-800">
                                    Move <span className="font-semibold">{rec.developer}</span> from{' '}
                                    <span className="font-medium">{rec.fromProject}</span> to{' '}
                                    <span className="font-medium">{rec.toProject}</span>
                                </p>
                                <p className="text-sm text-emerald-700 mt-2">Impact: {rec.impact}</p>
                            </div>
                        ))}
                        {risks.slice(0, 2).map((r) => (
                            <div key={r.projectId} className="dashboard-card p-4 border-amber-100 bg-amber-50/30">
                                <p className="text-sm font-medium text-slate-900">{r.name}</p>
                                <p className="text-xs text-slate-600 mt-1">{r.reasons?.join(' · ')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </WorkspaceSection>
        </PageContainer>
    );
}
