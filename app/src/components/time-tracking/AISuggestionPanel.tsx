import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeSuggestion } from './types';

interface AISuggestionPanelProps {
    suggestions: TimeSuggestion[];
    onApply?: (suggestion: TimeSuggestion) => void;
}

export function AISuggestionPanel({ suggestions, onApply }: AISuggestionPanelProps) {
    return (
        <div className="dashboard-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">AI Suggestions</h3>
            </div>
            <div className="p-3 space-y-2">
                {suggestions.map((s) => (
                    <div
                        key={s.id}
                        className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-2.5"
                    >
                        <p className="text-[11px] text-slate-700 leading-relaxed">{s.message}</p>
                        {s.actionLabel && onApply && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 mt-2 text-[11px] text-indigo-700 hover:bg-indigo-100 px-2"
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
