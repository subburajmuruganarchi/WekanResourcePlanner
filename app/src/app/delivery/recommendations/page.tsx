import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useDeliveryRecommendations } from '@/lib/use-delivery-recommendations';

function priorityStyles(priority: string) {
    if (priority === 'High') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (priority === 'Medium') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function DeliveryRecommendationsPage() {
    const { items, loading, error, refetch } = useDeliveryRecommendations();

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Delivery Command"
                title="Suggested Actions"
                description="Rule-based recommendations from your portfolio allocations and current-week planner hours."
                action={
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetch()} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                }
            />

            <WorkspaceSection
                title="Portfolio actions"
                description="Sourced from delivery risks and planner/allocation gaps on your assigned projects."
            >
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 p-6 dashboard-card">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing portfolio allocations and planner hours…
                    </div>
                ) : error ? (
                    <div className="dashboard-card p-6 flex items-start gap-3 border-rose-100 bg-rose-50/40">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-slate-900">Unable to load recommendations</p>
                            <p className="text-sm text-slate-600 mt-1">{error}</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
                                Try again
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="dashboard-card p-8 text-center border-dashed">
                        <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-900">No actions needed right now</p>
                        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                            No medium or high delivery risks were found in your portfolio for the current week.
                            Recommendations appear when allocations or planner hours need attention.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.id} className="dashboard-card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                                            {item.source === 'raid-suggestion' ? 'Planner / allocation' : 'Delivery risk'}
                                        </p>
                                        <p className="font-semibold text-slate-900 mt-0.5">{item.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {item.projectName}
                                            {item.projectCode ? ` · ${item.projectCode}` : ''}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${priorityStyles(item.priority)}`}
                                    >
                                        {item.priority} priority
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">{item.description}</p>
                                <p className="text-sm text-slate-800 mt-3">
                                    <span className="font-medium text-emerald-800">Recommended action:</span>{' '}
                                    {item.recommendedAction}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </WorkspaceSection>
        </PageContainer>
    );
}
