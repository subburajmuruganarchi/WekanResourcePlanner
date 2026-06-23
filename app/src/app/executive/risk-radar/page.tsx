import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useExecutiveMetrics } from '@/lib/use-executive-metrics';

export default function RiskRadarPage() {
    const { executiveRisks, loading } = useExecutiveMetrics();

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Executive Command Center"
                title="Executive Risk Radar"
                description="Business-level delivery risks — impact, cause, and recommended executive action."
            />
            <WorkspaceSection title="Active business risks">
                <div className="space-y-3">
                    {loading ? (
                        <p className="text-sm text-slate-500">Analyzing risks…</p>
                    ) : executiveRisks.length === 0 ? (
                        <p className="text-sm text-slate-500">No elevated risks detected.</p>
                    ) : (
                        executiveRisks.map((risk) => (
                            <div key={risk.id} className="dashboard-card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                    <h3 className="font-semibold text-slate-900">{risk.title}</h3>
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                            risk.impact === 'High'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : risk.impact === 'Medium'
                                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        {risk.impact} impact
                                    </span>
                                </div>
                                {risk.projectName && (
                                    <p className="text-xs text-brand-600 font-medium mb-2">{risk.projectName}</p>
                                )}
                                <p className="text-sm text-slate-600"><span className="font-medium">Reason:</span> {risk.reason}</p>
                                <p className="text-sm text-slate-800 mt-2">
                                    <span className="font-medium">Recommended action:</span> {risk.action}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
