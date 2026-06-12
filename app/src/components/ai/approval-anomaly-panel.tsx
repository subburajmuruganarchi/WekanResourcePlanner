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
                    ? 'p-4 border-amber-200 bg-amber-50/60'
                    : 'p-4 border-blue-200 bg-blue-50/50'
            }
        >
            <div className="flex items-start gap-3">
                {tone === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : hasAnomalies ? (
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">Approval assistant</h3>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{summary.narrative}</p>
                    {hasAnomalies && (
                        <ul className="mt-3 space-y-2">
                            {summary.anomalies.slice(0, 8).map((a, i) => (
                                <li
                                    key={i}
                                    className={`text-xs px-3 py-2 rounded-lg border ${
                                        a.severity === 'critical'
                                            ? 'bg-red-50 border-red-200 text-red-800'
                                            : 'bg-white border-amber-100 text-amber-900'
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
