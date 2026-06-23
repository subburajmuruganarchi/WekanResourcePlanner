import { useCallback, useEffect, useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchRaidSuggestions, type RaidSuggestion } from '@/lib/risk-intelligence';
import { workspaceStore, type RaidItem } from '@/lib/workspace-store';
import { useAuth } from '@/lib/auth-context';

export function RaidSuggestionPanel({ className }: { className?: string }) {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<RaidSuggestion[]>([]);
    const [approved, setApproved] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchRaidSuggestions();
            setSuggestions(data ?? []);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const approveSuggestion = (suggestion: RaidSuggestion) => {
        if (!user?.id) return;
        const existing = workspaceStore.getRaid(user.id);
        const item: RaidItem = {
            id: `raid-${suggestion.id}-${Date.now()}`,
            type: 'Risk',
            title: suggestion.title,
            description: `${suggestion.description}\n\nRecommended: ${suggestion.recommendedAction}`,
            owner: user.name ?? 'Delivery Lead',
            priority: suggestion.priority,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            status: 'Open',
            impact: suggestion.severity === 'HIGH' ? 'High delivery impact' : 'Medium delivery impact',
            projectId: suggestion.projectId,
            createdAt: new Date().toISOString(),
        };
        workspaceStore.saveRaid(user.id, [item, ...existing]);
        setApproved((prev) => new Set(prev).add(suggestion.id));
    };

    if (loading) {
        return <p className="text-sm text-slate-500">Scanning planner for delivery risks…</p>;
    }

    if (suggestions.length === 0) {
        return (
            <p className="text-sm text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
                No planner-derived RAID suggestions. RAID board remains independent for manual tracking.
            </p>
        );
    }

    return (
        <div className={className}>
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <p className="text-sm font-semibold text-slate-900">AI RAID suggestions</p>
                <span className="text-xs text-slate-500">Planner risk → recommendation → your approval</span>
            </div>
            <div className="space-y-3">
                {suggestions.map((s) => {
                    const done = approved.has(s.id);
                    return (
                        <div key={s.id} className="dashboard-card p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-brand-600">
                                        {s.riskSource === 'allocation' ? 'Allocation risk' : 'Capacity risk'}
                                    </p>
                                    <p className="font-semibold text-slate-900">{s.title}</p>
                                    <p className="text-xs text-slate-500">
                                        {s.projectName} · {s.projectCode}
                                    </p>
                                </div>
                                <span className="text-xs font-medium text-amber-700">{s.priority} priority</span>
                            </div>
                            <p className="text-sm text-slate-600">{s.description}</p>
                            <p className="text-sm text-slate-800 mt-2">
                                <span className="font-medium">Recommendation:</span> {s.recommendedAction}
                            </p>
                            {done ? (
                                <p className="flex items-center gap-1.5 text-sm text-emerald-700 mt-3">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Added to your RAID board
                                </p>
                            ) : (
                                <Button
                                    size="sm"
                                    className="mt-3 enterprise-gradient-bg text-white border-0"
                                    onClick={() => approveSuggestion(s)}
                                >
                                    Approve & create RAID item
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
