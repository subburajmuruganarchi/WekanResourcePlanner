import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeSuggestion } from './types';

interface AISuggestionPanelProps {
    suggestions: TimeSuggestion[];
    onApply?: (suggestion: TimeSuggestion) => void;
    compact?: boolean;
}

export function AISuggestionPanel({ suggestions, onApply, compact }: AISuggestionPanelProps) {
    if (compact) {
        return (
            <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-500" />
                    AI Suggestions
                </p>
                {suggestions.map((s) => (
                    <div key={s.id} className="rounded-lg bg-brand-50/60 border border-brand-100/80 px-2.5 py-2">
                        <p className="text-[10px] text-slate-700 leading-relaxed">{s.message}</p>
                        {s.actionLabel && onApply && (
                            <button
                                type="button"
                                className="mt-1.5 text-[10px] font-medium text-brand-700 hover:underline inline-flex items-center gap-0.5"
                                onClick={() => onApply(s)}
                            >
                                {s.actionLabel}
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="dashboard-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-brand-50 to-white">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-semibold text-slate-900">AI Suggestions</h3>
            </div>
            <div className="p-3 space-y-2">
                {suggestions.map((s) => (
                    <div
                        key={s.id}
                        className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2.5"
                    >
                        <p className="text-[11px] text-slate-700 leading-relaxed">{s.message}</p>
                        {s.actionLabel && onApply && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 mt-2 text-[11px] text-brand-700 hover:bg-brand-100 px-2"
                                onClick={() => onApply(s)}
                            >
                                {s.actionLabel}
                                <ChevronRight className="w-3 h-3 ml-0.5" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
