import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ApprovalInsightSummary } from '@/lib/use-ai-insights';

export function ApprovalAnomalyPanel({ summary }: { summary: ApprovalInsightSummary | null }) {
    if (!summary) return null;

    return (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Approval assistant</h3>
                    <p className="text-sm text-gray-700 mt-1">{summary.narrative}</p>
                    {summary.anomalies.length > 0 && (
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
