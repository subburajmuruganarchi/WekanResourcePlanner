import { useMemo, useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ROLES, type SystemRoleName } from '@/lib/roles';
import { fetchTimeEntrySuggestions, useDashboardInsight } from '@/lib/use-ai-insights';
import { buildDashboardPeriodRange, getCurrentMonthValue, getCurrentWeekStart } from '@/lib/dashboard-period';
import { getRoleDisplayLabel, normalizeRoleName } from '@/lib/role-utils';
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
    { label: 'Which projects are at risk?', query: 'customer delivery risk', kind: 'management' },
    { label: 'Where is utilization below target?', query: 'utilization below target', kind: 'management' },
];

const PROMPTS: Record<SystemRoleName, CopilotPrompt[]> = {
    [ROLES.ADMIN]: MANAGEMENT_PROMPTS,
    [ROLES.CEO]: MANAGEMENT_PROMPTS,
    [ROLES.DELIVERY_MANAGER]: [
        { label: 'Which projects need attention?', query: 'portfolio attention projects', kind: 'management' },
        { label: 'Recommend resource moves', query: 'resource optimization', kind: 'management' },
        { label: 'Summarize portfolio delivery health', query: 'portfolio delivery health', kind: 'management' },
    ],
    [ROLES.PROJECT_MANAGER]: [
        { label: 'Generate weekly status report', query: 'weekly status report', kind: 'management' },
        { label: 'What risks should I escalate?', query: 'project risks escalate', kind: 'management' },
        { label: 'Who is missing timesheets?', query: 'missing team timesheets', kind: 'management' },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries', kind: 'employee' },
        { label: 'What should I focus on today?', query: 'today focus', kind: 'employee' },
        { label: 'How am I tracking this week?', query: 'week progress', kind: 'employee' },
    ],
    [ROLES.USER]: [
        { label: 'Show missing timesheet entries', query: 'missing timesheet entries', kind: 'employee' },
        { label: 'What should I focus on today?', query: 'today focus', kind: 'employee' },
    ],
};

const MANAGEMENT_ROLES: SystemRoleName[] = [
    ROLES.ADMIN,
    ROLES.CEO,
    ROLES.DELIVERY_MANAGER,
    ROLES.PROJECT_MANAGER,
];

function isManagementRole(role: SystemRoleName): boolean {
    return MANAGEMENT_ROLES.includes(role);
}

function promptsForRole(role: string | undefined): CopilotPrompt[] {
    const canonical = normalizeRoleName(role) as SystemRoleName;
    return PROMPTS[canonical] ?? PROMPTS[ROLES.EMPLOYEE];
}

export function AICopilotPanel({ className }: { className?: string }) {
    const { user } = useAuth();
    const accessRole = normalizeRoleName(user?.role) as SystemRoleName;
    const roleLabel = getRoleDisplayLabel(user?.role, {
        jobRole: user?.jobRole,
        position: user?.position,
    });
    const prompts = useMemo(() => promptsForRole(user?.role), [user?.role]);
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
            if (prompt.kind === 'management' && isManagementRole(accessRole)) {
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
                    'fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white shadow-lg enterprise-gradient-bg transition-opacity hover:opacity-95',
                    className
                )}
            >
                <Sparkles className="h-4 w-4" />
                AI Copilot
            </button>

            {open && (
                <div className="fixed bottom-24 left-6 z-40 flex w-[min(420px,calc(100vw-2rem))] max-h-[min(70vh,520px)] flex-col dashboard-card overflow-hidden">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">R360 AI Copilot</p>
                            <p className="text-xs text-slate-500">{roleLabel} · role-aware assistant</p>
                        </div>
                        <button
                            type="button"
                            className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
                            onClick={() => setOpen(false)}
                        >
                            Close
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="border-b border-slate-100 p-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Suggested questions
                            </p>
                            <div className="space-y-2">
                                {prompts.map((p) => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => void runPrompt(p)}
                                        disabled={loading}
                                        className={cn(
                                            'w-full rounded-lg border px-3 py-2.5 text-left text-sm text-slate-700 transition-colors',
                                            activePrompt === p.label
                                                ? 'border-brand-300 bg-brand-50/80 text-brand-900'
                                                : 'border-slate-100 hover:border-brand-200 hover:bg-brand-50/50'
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(loading || error || response) && (
                            <div className="p-4">
                                {loading && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Analyzing…
                                    </div>
                                )}
                                {error && (
                                    <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                                        {error}
                                    </div>
                                )}
                                {activePrompt && response && !loading && !error && (
                                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                        <p className="mb-1 text-xs font-semibold text-brand-600">{activePrompt}</p>
                                        <p className="text-sm leading-relaxed text-slate-700">{response}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                        <Button size="sm" variant="outline" className="w-full gap-2" disabled>
                            <Send className="h-3.5 w-3.5" />
                            Ask a follow-up (coming soon)
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
