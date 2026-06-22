import { Sparkles, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AIInsight } from './types';

interface AIInsightPanelProps {
    insights: AIInsight[];
    onReview?: (insight: AIInsight) => void;
    onApply?: (insight: AIInsight) => void;
    collapsed?: boolean;
    onToggle?: () => void;
}

const ICONS = {
    risk: AlertTriangle,
    'skill-gap': Lightbulb,
    optimization: Sparkles,
};

const ACCENTS = {
    risk: 'border-amber-200 bg-amber-50/50',
    'skill-gap': 'border-indigo-200 bg-indigo-50/30',
    optimization: 'border-emerald-200 bg-emerald-50/30',
};

export function AIInsightPanel({
    insights,
    onReview,
    onApply,
    collapsed,
    onToggle,
}: AIInsightPanelProps) {
    if (collapsed) {
        return (
            <button
                type="button"
                onClick={onToggle}
                className="fixed right-4 top-24 z-20 flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 shadow-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 lg:hidden"
            >
                <Sparkles className="w-4 h-4" />
                AI Assistant
            </button>
        );
    }

    return (
        <aside className="w-full xl:w-[300px] shrink-0 space-y-3">
            <div className="dashboard-card overflow-hidden sticky top-20">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 enterprise-gradient-bg">
                    <div className="flex items-center gap-2 text-white">
                        <Sparkles className="w-4 h-4" />
                        <h2 className="text-sm font-semibold">AI Workforce Assistant</h2>
                    </div>
                    {onToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="text-white/80 hover:text-white text-xs xl:hidden"
                        >
                            Hide
                        </button>
                    )}
                </div>
                <div className="p-3 space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
                    {insights.map((insight) => {
                        const Icon = ICONS[insight.type];
                        return (
                            <div
                                key={insight.id}
                                className={`rounded-xl border p-3 ${ACCENTS[insight.type]}`}
                            >
                                <div className="flex items-start gap-2">
                                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-900">
                                            {insight.title}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                            {insight.description}
                                        </p>
                                        {insight.actionLabel && (
                                            <div className="flex flex-wrap gap-2 mt-2.5">
                                                {insight.type === 'optimization' && onApply && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-7 text-[11px] enterprise-gradient-bg text-white border-0"
                                                        onClick={() => onApply(insight)}
                                                    >
                                                        Apply Recommendation
                                                    </Button>
                                                )}
                                                {onReview && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[11px] gap-1"
                                                        onClick={() => onReview(insight)}
                                                    >
                                                        Review
                                                        <ChevronRight className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
