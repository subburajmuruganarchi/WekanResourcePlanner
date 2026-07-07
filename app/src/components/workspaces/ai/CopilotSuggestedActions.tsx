import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getCopilotPageContext } from '@/lib/copilot-context';
import { cn } from '@/lib/utils';

interface CopilotSuggestedActionsProps {
    className?: string;
    max?: number;
}

/**
 * Inline page-context prompts surfaced as chips (opens Copilot panel via custom event).
 */
export function CopilotSuggestedActions({ className, max = 3 }: CopilotSuggestedActionsProps) {
    const { pathname } = useLocation();
    const context = useMemo(() => getCopilotPageContext(pathname), [pathname]);
    const prompts = context.prompts.slice(0, max);

    if (prompts.length === 0) return null;

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5',
                className
            )}
            role="region"
            aria-label="AI suggested actions"
        >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" aria-hidden />
                Suggested
            </span>
            {prompts.map((p) => (
                <button
                    key={p.label}
                    type="button"
                    className="text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-card text-card-foreground hover:border-brand-300 hover:bg-brand-50/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                        window.dispatchEvent(
                            new CustomEvent('r360:copilot-prompt', {
                                detail: { label: p.label, query: p.query },
                            })
                        );
                    }}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}
