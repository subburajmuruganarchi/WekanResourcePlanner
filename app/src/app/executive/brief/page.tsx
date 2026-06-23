import { Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useDashboardInsight } from '@/lib/use-ai-insights';
import { useEffect } from 'react';

export default function ExecutiveBriefPage() {
    const { insight, loading, fetchInsight } = useDashboardInsight();

    useEffect(() => {
        void fetchInsight();
    }, [fetchInsight]);

    return (
        <PageContainer className="space-y-6">
            <WorkspacePageHeader
                eyebrow="Executive Command Center"
                title="AI Executive Brief"
                description="AI-generated summary of company delivery health for leadership review."
            />
            <WorkspaceSection title="Briefing">
                <div className="dashboard-card p-6 min-h-[200px]">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Preparing executive brief…
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-slate-700 leading-relaxed">{insight?.narrative ?? 'No briefing available.'}</p>
                            {insight?.bullets && insight.bullets.length > 0 && (
                                <ul className="mt-4 space-y-2">
                                    {insight.bullets.map((b) => (
                                        <li key={b} className="text-sm text-slate-600 flex gap-2">
                                            <span className="text-indigo-500">•</span>
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </WorkspaceSection>
        </PageContainer>
    );
}
