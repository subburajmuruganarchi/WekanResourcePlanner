import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/roles';
import { fetchTimeEntrySuggestions, useDashboardInsight } from '@/lib/use-ai-insights';
import { buildDashboardPeriodRange, getCurrentMonthValue, getCurrentWeekStart } from '@/lib/dashboard-period';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PromptKind = 'management' | 'employee';

interface CopilotPrompt {
    label: string;
    query: string;
    kind: PromptKind;
}

const MANAGEMENT_PROMPTS: CopilotPrompt[] = [
    { label: 'Summarize company delivery health', query: 'executive delivery health summary', kind: 'management' },
    { label: 'Which customers are at risk?', query: 'customer delivery risk', kind: 'management' },
];

const PROMPTS: Record<string, CopilotPrompt[]> = {
    [ROLES.ADMIN]: MANAGEMENT_PROMPTS,
    [ROLES.CEO]: MANAGEMENT_PROMPTS,
    [ROLES.DELIVERY_MANAGER]: [
        { label: 'Which projects need attention?', query: 'portfolio attention projects', kind: 'management' },
        { label: 'Recommend resource moves', query: 'resource optimization', kind: 'management' },
    ],
    [ROLES.PROJECT_MANAGER]: [
        { label: 'Generate weekly status report', query: 'weekly status report', kind: 'management' },
        { label: 'What risks should I escalate?', query: 'project risks escalate', kind: 'management' },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries', kind: 'employee' },
        { label: 'What should I focus on today?', query: 'today focus', kind: 'employee' },
    ],
    [ROLES.USER]: [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries', kind: 'employee' },
    ],
};

function isManagementRole(role: string): boolean {
    return (
        role === ROLES.ADMIN ||
        role === ROLES.CEO ||
        role === ROLES.DELIVERY_MANAGER ||
        role === ROLES.PROJECT_MANAGER
    );
}

export function AICopilotPanel({ className }: { className?: string }) {
    const { user } = useAuth();
    const role = user?.role ?? ROLES.EMPLOYEE;
    const prompts = PROMPTS[role] ?? PROMPTS[ROLES.EMPLOYEE];
    const { fetchInsight } = useDashboardInsight();
    const [open, setOpen] = useState(false);
    const [activePrompt, setActivePrompt] = useState<string | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runPrompt = async (prompt: CopilotPrompt) => {
        setActivePrompt(prompt.label);
        setResponse(null);
        setError(null);
        setLoading(true);

        try {
            if (prompt.kind === 'management' && isManagementRole(role)) {
                const period = buildDashboardPeriodRange('week', getCurrentWeekStart(), getCurrentMonthValue());
                const data = await fetchInsight({
                    weekStartFrom: period.weekStartFrom,
                    weekStartTo: period.weekStartTo,
                });
                setResponse(data?.narrative ?? 'No summary available for the current week.');
                return;
            }

            if (!user?.id) {
                setError('Sign in to use personalized suggestions.');
                return;
            }

            const week = getCurrentWeekStart();
            const suggestions = await fetchTimeEntrySuggestions(user.id, week);

            if (prompt.query === 'missing timesheet entries') {
                const missingDays = (suggestions?.days ?? []).filter((d) => d.suggestedHours > 0);
                if (missingDays.length === 0) {
                    setResponse(
                        'No allocation forecast for this week. Log time for any project work you completed and submit before Friday close.'
                    );
                } else {
                    const dayList = missingDays
                        .slice(0, 5)
                        .map((d) => `${d.date} (~${d.suggestedHours}h planned)`)
                        .join(', ');
                    setResponse(
                        `Based on your planner allocation, focus on logging time for: ${dayList}. ${suggestions?.narrative ?? ''}`
                    );
                }
                return;
            }

            setResponse(
                suggestions?.narrative ??
                'Review your timesheet for the current week and submit any draft entries before Friday close.'
            );
        } catch {
            setError('Could not load Copilot insight. Try again in a moment.');
        } finally {
            setLoading(false);
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
                        <button
                            type="button"
                            className="text-xs text-slate-400 hover:text-slate-600"
                            onClick={() => setOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                        {prompts.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => void runPrompt(p)}
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
                        {error && (
                            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-100 text-sm text-rose-700">
                                {error}
                            </div>
                        )}
                        {activePrompt && response && !loading && !error && (
                            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-xs font-semibold text-brand-600 mb-1">{activePrompt}</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{response}</p>
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
