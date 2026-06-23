import { Sparkles, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { WorkspaceMetricCard, WorkspacePageHeader, WorkspaceSection } from '@/components/workspaces/shared';
import { useCapacityForecast } from '@/lib/use-executive-metrics';

export default function StrategicCapacityPage() {
    const { available, committed, gap, recommendation, utilization, loading } = useCapacityForecast();

    return (
        <PageContainer className="space-y-8">
            <WorkspacePageHeader
                eyebrow="Executive Command Center"
                title="Strategic Capacity Forecast"
                description="Next-quarter workforce capacity visibility for executive planning."
            />

            <WorkspaceSection title="Next quarter capacity">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <WorkspaceMetricCard
                        label="Available Capacity"
                        value={loading ? '—' : `${available} FTE`}
                        hint={`Current utilization ${utilization}%`}
                        icon={TrendingUp}
                        accent="emerald"
                    />
                    <WorkspaceMetricCard label="Committed Capacity" value={loading ? '—' : `${committed} FTE`} accent="indigo" />
                    <WorkspaceMetricCard label="Capacity Gap" value={loading ? '—' : `${gap} FTE`} accent={gap > 0 ? 'rose' : 'emerald'} />
                </div>
            </WorkspaceSection>

            <div className="dashboard-card p-6 border-brand-100 bg-gradient-to-br from-brand-50/50 to-white">
                <div className="flex gap-3">
                    <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-slate-900">AI recommendation</p>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{recommendation}</p>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
