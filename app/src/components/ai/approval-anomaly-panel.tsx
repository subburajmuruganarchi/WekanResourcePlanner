import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ApprovalInsightSummary } from '@/lib/use-ai-insights';

export function ApprovalAnomalyPanel({ summary }: { summary: ApprovalInsightSummary | null }) {
    if (!summary) return null;

    const hasPending = summary.totalPending > 0;
    const hasAnomalies = summary.anomalies.length > 0;

    if (!hasPending) return null;

    const tone = hasAnomalies ? 'warning' : 'info';

    return (
        <Card
            className={
                tone === 'warning'
                    ? 'p-4 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/30'
                    : 'p-4 border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20'
            }
        >
            <div className="flex items-start gap-3">
                {tone === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                ) : hasAnomalies ? (
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Approval assistant</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{summary.narrative}</p>
                    {hasAnomalies && (
                        <ul className="mt-3 space-y-2">
                            {summary.anomalies.slice(0, 8).map((a, i) => (
                                <li
                                    key={i}
                                    className={`text-xs px-3 py-2 rounded-lg border ${
                                        a.severity === 'critical'
                                            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-200'
                                            : 'bg-card border-amber-100 dark:border-amber-500/20 text-amber-900 dark:text-amber-100'
                                    }`}
                                >
                                    {a.message}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Card>
    );
}
