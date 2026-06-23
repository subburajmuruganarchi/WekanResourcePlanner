import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { canSeeManagementDashboard } from '@/lib/roles';
import { PageContainer } from '@/components/layout/page-container';
import { AiInsightPanel } from '@/components/ai/ai-insight-panel';
import { DeliveryRiskCards, SkillGapForecastCards } from '@/components/dashboard/staffing-risk-cards';
import {
    fetchDeliveryRisks,
    fetchSkillGapForecasts,
    type DeliveryRiskItem,
    type SkillGapForecastItem,
} from '@/lib/risk-intelligence';
import { useDashboardInsight, fetchApprovalAnomalies, type ApprovalInsightSummary } from '@/lib/use-ai-insights';
import { Sparkles, ShieldAlert, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function InsightsCenterPage() {
    const { user } = useAuth();
    const { insight, loading, fetchInsight } = useDashboardInsight();
    const [approvalSummary, setApprovalSummary] = useState<ApprovalInsightSummary | null>(null);
    const [deliveryRisks, setDeliveryRisks] = useState<DeliveryRiskItem[]>([]);
    const [forecasts, setForecasts] = useState<SkillGapForecastItem[]>([]);
    const [risksLoading, setRisksLoading] = useState(true);

    const canAccess = canSeeManagementDashboard(user?.role);

    useEffect(() => {
        if (canAccess) {
            fetchInsight();
            fetchApprovalAnomalies()
                .then(setApprovalSummary)
                .catch(() => setApprovalSummary(null));
            setRisksLoading(true);
            Promise.all([fetchDeliveryRisks(), fetchSkillGapForecasts()])
                .then(([dr, fc]) => {
                    setDeliveryRisks(dr ?? []);
                    setForecasts(fc ?? []);
                })
                .catch(() => {
                    setDeliveryRisks([]);
                    setForecasts([]);
                })
                .finally(() => setRisksLoading(false));
        }
    }, [canAccess, fetchInsight]);

    if (!canAccess) {
        return (
            <PageContainer className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Insights Center</h1>
                <p className="text-gray-600 mt-2 max-w-md">
                    Available to management roles. Risk intelligence uses Project_Allocation and the weekly planner.
                </p>
            </PageContainer>
        );
    }

    return (
        <PageContainer className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-brand-600" />
                    Insights Center
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Operational delivery risk (allocation + planner) is separate from future capability forecasts (project plan).
                </p>
            </div>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">1. Workforce Insights</h2>
                <AiInsightPanel
                    title="Weekly narrative"
                    narrative={insight?.narrative}
                    bullets={insight?.bullets}
                    loading={loading}
                />
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">2. Current Delivery Risk</h2>
                <p className="text-xs text-gray-500 mb-3">
                    Source: Project_Allocation + weekly planner. Does not use Project sheet role/skill requirements.
                </p>
                <DeliveryRiskCards risks={deliveryRisks} loading={risksLoading} />
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">3. Future Capability Gap</h2>
                <p className="text-xs text-gray-500 mb-3">Planning forecast only — not counted as current delivery risk.</p>
                <SkillGapForecastCards forecasts={forecasts} loading={risksLoading} />
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">4. Allocation Explanations</h2>
                <Card className="p-4 text-sm text-gray-700 border-gray-200">
                    Ranking explanations come from live allocation data. Resource moves still require management approval.
                </Card>
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">5. Approval Anomalies</h2>
                {approvalSummary ? (
                    <AiInsightPanel
                        title="PM approval assistant"
                        narrative={approvalSummary.narrative}
                        bullets={approvalSummary.anomalies.slice(0, 5).map((a) => a.message)}
                    />
                ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">6. Forecast Widgets</h2>
                <Card className="p-4 text-sm text-gray-700">
                    Time Entry shows suggested hours from allocation forecast. You confirm every value manually.
                </Card>
            </section>
        </PageContainer>
    );
}
