import { AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeSuggestion } from './types';

interface AISuggestionCardProps {
    suggestions: TimeSuggestion[];
    onApply?: (suggestion: TimeSuggestion) => void;
}

export function AISuggestionCard({ suggestions, onApply }: AISuggestionCardProps) {
    const primary = suggestions[0];

    return (
        <section className="tt-card w-full overflow-hidden">
            <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">AI Recommendations</h3>
                    <p className="text-xs text-slate-500">Based on your week and allocations</p>
                </div>
            </header>

            <div className="space-y-3 p-4">
                {primary ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm leading-relaxed text-slate-800">{primary.message}</p>
                                {primary.actionLabel && onApply && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="mt-3 h-8 enterprise-gradient-bg border-0 text-white hover:opacity-95"
                                        onClick={() => onApply(primary)}
                                    >
                                        {primary.actionLabel}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        You are on track this week. Keep logging time daily to maintain accurate utilization.
                    </p>
                )}

                {suggestions.slice(1).map((s) => (
                    <div
                        key={s.id}
                        className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-600"
                    >
                        {s.message}
                        {s.actionLabel && onApply && (
                            <button
                                type="button"
                                className="mt-2 block text-xs font-medium text-brand-700 hover:underline"
                                onClick={() => onApply(s)}
                            >
                                {s.actionLabel}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
