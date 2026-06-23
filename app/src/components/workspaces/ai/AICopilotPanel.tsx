import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/roles';
import { useDashboardInsight } from '@/lib/use-ai-insights';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROMPTS: Record<string, { label: string; query: string }[]> = {
    [ROLES.CEO]: [
        { label: 'Summarize company delivery health', query: 'executive delivery health summary' },
        { label: 'Which customers are at risk?', query: 'customer delivery risk' },
    ],
    [ROLES.DELIVERY_MANAGER]: [
        { label: 'Which projects need attention?', query: 'portfolio attention projects' },
        { label: 'Recommend resource moves', query: 'resource optimization' },
    ],
    [ROLES.PROJECT_MANAGER]: [
        { label: 'Generate weekly status report', query: 'weekly status report' },
        { label: 'What risks should I escalate?', query: 'project risks escalate' },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries' },
        { label: 'What should I focus on today?', query: 'today focus' },
    ],
    [ROLES.USER]: [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries' },
    ],
};

export function AICopilotPanel({ className }: { className?: string }) {
    const { user } = useAuth();
    const role = user?.role ?? ROLES.EMPLOYEE;
    const prompts = PROMPTS[role] ?? PROMPTS[ROLES.EMPLOYEE];
    const { insight, loading, fetchInsight } = useDashboardInsight();
    const [open, setOpen] = useState(false);
    const [activePrompt, setActivePrompt] = useState<string | null>(null);

    const runPrompt = async (label: string) => {
        setActivePrompt(label);
        if (role !== ROLES.EMPLOYEE && role !== ROLES.USER) {
            await fetchInsight();
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg enterprise-gradient-bg text-white font-medium text-sm hover:opacity-95 transition-opacity',
                    className
                )}
            >
                <Sparkles className="w-4 h-4" />
                AI Copilot
            </button>

            {open && (
                <div className="fixed bottom-24 right-6 z-40 w-[min(420px,calc(100vw-2rem))] dashboard-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">R360 AI Copilot</p>
                            <p className="text-xs text-slate-500">Role-aware assistant</p>
                        </div>
                        <button type="button" className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
                            Close
                        </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                        {prompts.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => void runPrompt(p.label)}
                                className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/50 text-sm text-slate-700 transition-colors"
                            >
                                {p.label}
                            </button>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing…
                            </div>
                        )}
                        {activePrompt && insight?.narrative && !loading && (
                            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-xs font-semibold text-brand-600 mb-1">{activePrompt}</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{insight.narrative}</p>
                            </div>
                        )}
                        {activePrompt && role === ROLES.EMPLOYEE && (
                            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700">
                                Review your timesheet for the current week and submit any draft entries before Friday close.
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <Button size="sm" variant="outline" className="w-full gap-2" disabled>
                            <Send className="w-3.5 h-3.5" />
                            Ask a follow-up (coming soon)
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
