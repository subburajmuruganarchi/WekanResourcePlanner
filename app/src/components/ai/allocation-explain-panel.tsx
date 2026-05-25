import { Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AllocationExplanation } from '@/lib/use-ai-insights';

interface AllocationExplainPanelProps {
    explanation: AllocationExplanation | null;
    loading: boolean;
    onClose: () => void;
}

export function AllocationExplainPanel({ explanation, loading, onClose }: AllocationExplainPanelProps) {
    if (!loading && !explanation) return null;

    return (
        <Card className="mt-4 p-5 border-indigo-100 bg-indigo-50/40">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-semibold text-gray-900">Why suggested?</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Read-only explanation — ranking score unchanged</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing rank factors…
                </div>
            ) : explanation ? (
                <div className="space-y-3 text-sm">
                    <p className="text-gray-800">{explanation.summary}</p>
                    <div className="flex gap-4 text-xs text-gray-600">
                        <span>Confidence: {explanation.confidencePercent}%</span>
                        <span>Rank #{explanation.rankPosition}</span>
                        <span>Availability: {explanation.factors.availabilityPercent}%</span>
                    </div>
                    <p className="text-gray-600">{explanation.factors.utilizationNote}</p>
                    {explanation.skillGaps.length > 0 && (
                        <ul className="text-amber-700 list-disc pl-4">
                            {explanation.skillGaps.map((g, i) => (
                                <li key={i}>{g}</li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </Card>
    );
}
