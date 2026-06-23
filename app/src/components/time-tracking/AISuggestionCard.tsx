import { AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimeSuggestion } from './types';

interface AISuggestionCardProps {
    suggestions: TimeSuggestion[];
    onApply?: (suggestion: TimeSuggestion) => void;
}

export function AISuggestionCard({ suggestions, onApply }: AISuggestionCardProps) {
    if (suggestions.length === 0) return null;

    const primary = suggestions[0];

    return (
        <div className="tt-card overflow-hidden w-full max-w-[360px] mt-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-semibold text-slate-900">AI Recommendations</h3>
            </div>
            <div className="p-5 space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-4">
                    <div className="flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 leading-relaxed">
                                {primary.message}
                            </p>
                            {primary.actionLabel && onApply && (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="mt-3 h-9 enterprise-gradient-bg text-white border-0 hover:opacity-95"
                                    onClick={() => onApply(primary)}
                                >
                                    Apply suggestion
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {suggestions.slice(1).map((s) => (
                    <p key={s.id} className="text-sm text-slate-600 leading-relaxed px-1">
                        {s.message}
                    </p>
                ))}
            </div>
        </div>
    );
}
