import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PageContainer } from '@/components/layout/page-container';
import { AiInsightPanel } from '@/components/ai/ai-insight-panel';
import { api } from '@/lib/api-client';
import { useDashboardInsight, fetchApprovalAnomalies, type ApprovalInsightSummary } from '@/lib/use-ai-insights';
import { Sparkles, ShieldAlert, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function InsightsCenterPage() {
    const { user } = useAuth();
    const { insight, loading, fetchInsight } = useDashboardInsight();
    const [approvalSummary, setApprovalSummary] = useState<ApprovalInsightSummary | null>(null);
    const [staffingRisks, setStaffingRisks] = useState<{ level: string; name: string; code: string }[]>([]);

    const canAccess = user?.role === 'Admin' || user?.role === 'Project Manager';

    useEffect(() => {
        if (canAccess) {
            fetchInsight();
            fetchApprovalAnomalies()
                .then(setApprovalSummary)
                .catch(() => setApprovalSummary(null));
            api.get<{ level: string; name: string; code: string }[]>('/dashboard/staffing-risks')
                .then(setStaffingRisks)
                .catch(() => setStaffingRisks([]));
        }
    }, [canAccess, fetchInsight]);

    if (!canAccess) {
        return (
            <PageContainer className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Insights Center</h1>
                <p className="text-gray-600 mt-2 max-w-md">
                    Available to Admin and Project Manager roles. Embedded assistants live on Dashboard, Projects, and PM Approvals.
                </p>
            </PageContainer>
        );
    }

    return (
        <PageContainer className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                    Insights Center
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Tool-based read-only intelligence from your live R360 data. No chat — explanations and alerts only.
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
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">2. Allocation Explanations</h2>
                <Card className="p-4 text-sm text-gray-700 border-gray-200">
                    Review staffing recommendations from project insights and staffing risk summaries.
                    Ranking scores come from the existing ranking service — AI only explains factors. Resource assignment changes require Admin approval.
                </Card>
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">3. Staffing Risks</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staffingRisks.length > 0 ? staffingRisks.map((r, i) => (
                        <Card key={i} className="p-4">
                            <p className="font-medium text-sm">{r.name}</p>
                            <p className="text-xs text-gray-500">{r.code}</p>
                            <p className="text-xs font-semibold mt-2 text-amber-700">Risk: {r.level}</p>
                        </Card>
                    )) : (
                        <p className="text-sm text-gray-500 col-span-full">No elevated risks on active projects.</p>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Risk badges also appear on project detail pages.</p>
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">4. Approval Anomalies</h2>
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
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">5. Forecast Widgets</h2>
                <Card className="p-4 text-sm text-gray-700">
                    Time Entry shows <strong>Suggested Hours</strong> from allocation forecast and last week&apos;s pattern. You confirm every value manually.
                </Card>
            </section>
        </PageContainer>
    );
}
